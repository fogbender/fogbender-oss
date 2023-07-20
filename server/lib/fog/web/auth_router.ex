defmodule Fog.Web.AuthRouter do
  import Ecto.Query
  use Plug.Router

  alias Fog.{Data, Repo}

  plug(:match)
  plug(:fetch_query_params)

  plug(Fog.Plug.AgentSession, perform_manual_login: true)
  plug(:store_data_before_redirect)
  plug(Ueberauth)
  plug(:dispatch)

  defp store_data_before_redirect(conn, _opts) do
    # handle `get "/google"` before `Ueberauth` does
    case conn.path_info do
      ["google"] ->
        return_url =
          with return_url when is_binary(return_url) <- conn.query_params["returnUrl"],
               [referer] when is_binary(referer) <- get_req_header(conn, "referer"),
               %URI{authority: same_authority} <- URI.parse(return_url),
               %URI{authority: ^same_authority} <- URI.parse(referer) do
            return_url
          end

        if return_url do
          conn = fetch_session(conn)
          conn = put_session(conn, :return_url, return_url)
          conn
        else
          conn = send_resp(conn, 400, "returnUrl and referer do not match")
          conn |> halt()
        end

      _ ->
        conn
    end
  end

  get "/google/test" do
    conn = fetch_session(conn)
    x = get_session(conn)
    conn = put_session(conn, :test, :ok)

    user =
      with %{token: token} <- x["ueberauth"] do
        path = "https://www.googleapis.com/oauth2/v3/userinfo"

        case Ueberauth.Strategy.Google.OAuth.get(token, path) do
          {:ok, %{body: %{"email" => email}}} ->
            email

          {:error, %{status_code: 401}} ->
            "google token expired"
        end
      end

    send_resp(conn, 200, "OK #{user} #{inspect(x)}")
  end

  post "/cognito" do
    # TODO: add CSRF
    conn = fetch_session(conn)
    {:ok, body, conn} = Plug.Conn.read_body(conn, opts)

    {:ok,
     %{
       "email_verified" => true,
       "email" => email,
       "name" => name
     }} = Fog.CognitoJwks.Token.verify_and_validate(body)

    image_url = nil

    {:ok, %{id: agent_id} = agent} =
      Repo.insert(%Data.Agent{email: email, name: name, image_url: image_url},
        on_conflict: {:replace, [:name, :updated_at]},
        conflict_target: :email,
        returning: true
      )

    :ok = assign_roles_based_on_verified_domains(agent)

    conn = put_session(conn, :agent_id, agent_id)
    return_url = get_session(conn)["return_url"]

    login_callback =
      if return_url do
        URI.to_string(
          URI.merge(URI.parse(return_url), %URI{
            path: "/login/callback",
            query: URI.encode_query(%{returnUrl: return_url})
          })
        )
      else
        nil
      end

    data =
      %{ok: true, login_callback: login_callback}
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/google/signout" do
    conn = fetch_session(conn)
    conn = clear_session(conn)
    send_resp(conn, 200, "OK SIGN OUT")
  end

  match _ do
    auth = Ueberauth.auth(conn)

    if auth do
      conn = fetch_session(conn)
      conn = put_session(conn, :ueberauth, auth.credentials)

      email = auth.info.email
      name = auth.info.name
      image_url = auth.info.image

      {:ok, %{id: agent_id} = agent} =
        Repo.insert(%Data.Agent{email: email, name: name, image_url: image_url},
          on_conflict: {:replace, [:name, :updated_at, :image_url]},
          conflict_target: :email,
          returning: true
        )

      :ok = assign_roles_based_on_verified_domains(agent)

      conn = put_session(conn, :agent_id, agent_id)
      return_url = get_session(conn)["return_url"]

      if return_url do
        login_callback =
          URI.to_string(
            URI.merge(URI.parse(return_url), %URI{
              path: "/login/callback",
              query: URI.encode_query(%{returnUrl: return_url})
            })
          )

        conn
        |> Plug.Conn.put_resp_header("location", login_callback)
        |> Plug.Conn.resp(302, "You are being redirected to #{login_callback}.")
        |> Plug.Conn.halt()
      else
        send_resp(conn, 200, "DONE #{email}")
      end
    else
      if conn.assigns[:ueberauth_failure] do
        send_resp(conn, 400, "Failed to sign in")
      else
        send_resp(conn, 404, "Not found")
      end
    end
  end

  def assign_roles_based_on_verified_domains(%Data.Agent{email: email, id: agent_id} = agent) do
    [_, domain] = email |> String.split("@")

    entries =
      from(
        d in Data.VendorVerifiedDomain,
        left_join: dr in Data.DeletedVendorAgentRole,
        on: dr.vendor_id == d.vendor_id and dr.agent_id == ^agent_id,
        where: is_nil(dr.deleted_by_agent_id),
        where: d.domain == ^domain and d.verified == true
      )
      |> Repo.all()
      |> Enum.map(fn %Data.VendorVerifiedDomain{vendor_id: vendor_id} ->
        %{
          agent_id: agent_id,
          vendor_id: vendor_id,
          role: "reader",
          inserted_at: DateTime.utc_now(),
          updated_at: DateTime.utc_now()
        }
      end)

    {_, vendor_agent_roles} =
      Repo.insert_all(
        Data.VendorAgentRole,
        entries,
        on_conflict: :nothing,
        conflict_target: [:agent_id, :vendor_id]
      )

    (vendor_agent_roles || [])
    |> Enum.each(fn %Data.VendorAgentRole{vendor_id: vendor_id} ->
      :ok = Fog.Api.Event.Agent.publish(agent, vendor_id)
    end)

    :ok
  end
end
