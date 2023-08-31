defmodule Fog.Web.PublicRouter do
  use Plug.Router
  alias Fog.{Repo}

  plug(:match)

  plug(:fetch_query_params)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(:dispatch)

  get "/about" do
    {:ok, vsn} = :application.get_key(:fog, :vsn)

    data =
      %{
        version: List.to_string(vsn)
      }
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  get "/file/:token" do
    token = URI.decode(token)

    case Fog.Token.validate(token) do
      %{type: :file_token, file_id: _id, file_path: file_path} ->
        url = Fog.FileStorage.file_url(file_path)

        conn
        |> put_resp_header("location", url)
        |> send_resp(302, "")
        |> halt

      _ ->
        send_resp(conn, 404, "File not found")
    end
  end

  get "/redirect_to_client" do
    token = conn.query_params["token"]
    room_id = conn.query_params["room_id"]

    case Fog.Token.validate(token) do
      %{type: "email_token", aud: "client", user_id: user_id} ->
        conn |> create_user_token_redirect(user_id, room_id)

      %{
        type: "fallback_email_token",
        workspace_id: workspace_id,
        email: email,
        name: name
      } ->
        {:ok, user} = Fog.Web.APIClientRouter.email_token_to_user(workspace_id, email, name)
        conn |> create_user_token_redirect(user.id, room_id)

      _ ->
        conn
        |> put_resp_content_type("text/html")
        |> send_resp(200, """
        Sorry, this link has expired. Please try a link from a more recent notification email or navigate to the support website directly.
        """)
    end
  end

  get "/msteams" do
    params = fetch_query_params(conn).params
    tenant_id = params["tenant"]

    unless is_nil(tenant_id) do
      :ok = Fog.Comms.MsTeams.Api.clear_access_token(tenant_id)
    end

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
    <div style="font-size: 24px;">Success! <button style="font-size: 24px; padding: 5px; background-color: #4376d8; border: none; color: white; cursor: pointer;" onClick="window.close();">OK</button></div>
    <script>
    window.close();
    </script>
    """)
  end

  if Mix.env() == :dev do
    forward("/emails", to: Bamboo.SentEmailViewerPlug)
  end

  get "/fogbender_visitor" do
    # default workspace used to support customers of Fogbender
    workspace_id = Fog.env(:fogbender_workspace_id)
    {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace_id)

    %Fog.Data.Workspace{
      signature_secret: signature_secret
    } = Fog.Data.Workspace |> Fog.Repo.get!(workspace_id)

    user_paseto = Fog.UserSignature.paseto_encrypt(%{visitor: true}, signature_secret)

    ok_json(
      conn,
      %Fog.Z.APIFogbenderVisitor{
        widgetId: widget_id,
        widgetPaseto: user_paseto
      }
      |> Fog.Z.APIFogbenderVisitor.to_json!()
    )
  end

  match _ do
    send_resp(conn, 404, "Not found")
  end

  defp create_user_token_redirect(conn, user_id, room_id) do
    user =
      Fog.Data.User
      |> Fog.Repo.get_by(id: user_id)
      |> Fog.Repo.preload([:customer, [workspace: :vendor]])

    %Fog.Data.User{
      customer: %Fog.Data.Customer{
        external_uid: customer_external_uid,
        name: customer_name
      },
      workspace: workspace,
      email: email,
      external_uid: external_uid,
      name: name
    } = user

    {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace)

    client_token = %Fog.Api.Auth.User{
      widgetId: widget_id,
      customerId: customer_external_uid,
      customerName: customer_name,
      userId: external_uid,
      userToken:
        Fog.Token.for_user_signature(
          external_uid,
          7 * 24 * 60 * 60
        ),
      userName: name,
      userEmail: email
    }

    client_token = Jason.encode!(Map.delete(client_token, :__struct__))

    url =
      "#{Fog.env(:fog_client_url)}/?#{URI.encode_query(%{token: client_token, room_id: room_id}, :rfc3986)}"

    send_html_redirect(conn, url, "#{user.workspace.vendor.name} Support")
  end

  defp ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  def send_html_redirect(conn, url, name) do
    conn
    |> put_resp_content_type("text/html")
    |> put_resp_header("Location", url)
    |> send_resp(302, """
    #{Fog.Email.Digest.content_tag(:meta, "", "http-equiv": "Refresh", content: "1000; URL=#{url}")}
    You are being redirected to #{Fog.Email.Digest.content_tag(:a, name, href: url)}.
    """)
  end
end
