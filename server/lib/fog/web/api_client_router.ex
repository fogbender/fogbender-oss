defmodule Fog.Web.APIClientRouter do
  require Logger

  alias Fog.{Data, Notify, Repo}

  use Plug.Router

  plug(:match)

  plug(:fetch_query_params)

  plug(Plug.Parsers,
    parsers: [:json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(:dispatch)

  @token_exp 7 * 24 * 3600

  get "/test" do
    send_resp(conn, 200, Jason.encode!(%{"test" => "passed"}))
  end

  post "/widget_info" do
    {:ok, body, conn} = Plug.Conn.read_body(conn, opts)
    body = body |> Jason.decode!()

    case body["token"] do
      nil ->
        send_resp(conn, 400, "Missing token parameter")

      token ->
        case token |> token_errors do
          [] ->
            case verify_token_signature(token) do
              {:ok, workspace} ->
                send_resp(conn, 200, Jason.encode!(%{"vendorName" => workspace.vendor.name}))

              {:error, error} ->
                send_resp(conn, 400, error)
            end

          errors ->
            send_resp(conn, 400, "Invalid token: missing #{errors |> Enum.join(", ")}")
        end
    end
  end

  post "/send_email_fallback_token" do
    {:ok, body, conn} = Plug.Conn.read_body(conn, opts)

    case Jason.decode(body) do
      {:ok,
       %{
         "email" => email,
         "name" => name,
         "token" => token
       }} ->
        case verify_token_signature(token) do
          {:error, error} ->
            send_resp(conn, 400, error)

          {:ok, workspace} ->
            email_token = Fog.Token.for_fallback_email(workspace.id, email, name, @token_exp)

            :ok = email_support_url(workspace, name, email, email_token)
            send_resp(conn, 200, Jason.encode!(%{"success" => true}))
        end
    end
  end

  def email_token_to_user(wid, email, name) do
    workspace = Repo.Workspace.get(wid) |> Repo.preload(:users)

    %Data.User{} =
      user =
      user(
        workspace |> Repo.preload(vendor: [customers: :domains]),
        name,
        email |> String.split("@")
      )

    {:ok, _} = Notify.EmailReceiveJob.find_room(workspace, user)

    {:ok, user}
  end

  defp email_support_url(workspace, name, email, email_token) do
    url =
      "#{Fog.env(:fog_api_url)}/public/redirect_to_client/?#{URI.encode_query(%{token: email_token}, :rfc3986)}"

    text = """
    #{name}, hello!
    \n\n
    To chat with #{workspace.vendor.name} support, please follow #{url}
    \n\n
    If you did not request support from #{workspace.vendor.name}, please ignore this email.\n\n
    - The #{workspace.vendor.name} team
    """

    send_res =
      Bamboo.Email.new_email(
        to: email,
        from: Fog.Mailer.source(),
        subject: "Your #{workspace.vendor.name} support request",
        text_body: text
      )
      |> Fog.Mailer.send()

    case send_res do
      :ok ->
        # test email
        :ok

      %Bamboo.Email{} ->
        :ok
    end
  end

  defp verify_token_signature(%{
         "widgetId" => widget_id,
         "widgetKey" => widget_key
       }) do
    case Repo.Workspace.from_widget_id(widget_id) do
      {:ok, %Data.Workspace{signature_secret: signature_secret} = workspace} ->
        case Fog.UserSignature.verify_widget_key(widget_key, signature_secret) do
          :ok ->
            {:ok, workspace |> Repo.preload([:vendor, :users])}

          _ ->
            {:error, "Invalid widgetKey"}
        end

      _ ->
        {:error, "Invalid widgetId"}
    end
  end

  defp token_errors(%{"userId" => _} = token) do
    [
      customer_id: token["customerId"],
      customer_name: token["customerName"],
      widget_id: token["widgetId"],
      widget_key: token["widgetKey"],
      user_jwt: token["userJWT"]
    ]
    |> Enum.reduce([], fn
      {:customer_id, nil}, acc ->
        ["customerId" | acc]

      {:customer_name, nil}, acc ->
        ["customerName" | acc]

      {:widget_id, nil}, acc ->
        ["widgetId" | acc]

      {:widget_key, nil}, acc ->
        case token["userJWT"] do
          nil ->
            ["widgetKey or userJWT" | acc]

          _ ->
            acc
        end

      _, acc ->
        acc
    end)
  end

  defp token_errors(token) do
    [
      widget_id: token["widgetId"],
      widget_key: token["widgetKey"]
    ]
    |> Enum.reduce([], fn
      {:widget_id, nil}, acc ->
        ["widgetId" | acc]

      {:widget_key, nil}, acc ->
        ["widgetKey" | acc]

      _, acc ->
        acc
    end)
  end

  defp user(workspace, name, [_, domain] = email_parts) do
    email = email_parts |> Enum.join("@")

    external = fn ->
      Notify.EmailReceiveJob.get_external_helpdesk_user(
        workspace,
        email,
        name || email
      )
    end

    case workspace.vendor.customers
         |> Enum.find(fn c -> c.domains |> Enum.find(fn d -> d.domain === domain end) end) do
      %Data.Customer{} = customer ->
        get_helpdesk_user(workspace, customer, email, name)

      nil ->
        case workspace.users |> Enum.filter(fn u -> u.email === email end) do
          [%Data.User{} = user] ->
            user

          [] ->
            external.()

          users ->
            users =
              users
              |> Enum.filter(fn u ->
                u = u |> Repo.preload([:customer])

                case u.customer.name do
                  "$Cust_External_" <> _ ->
                    false

                  "$Cust_Anonymous_" <> _ ->
                    false

                  _ ->
                    true
                end
              end)

            case users do
              [user] -> user
              _ -> external.()
            end
        end
    end
  end

  def get_helpdesk_user(workspace, customer, user_email, user_name) do
    Repo.User.import_external(
      workspace.vendor_id,
      workspace.id,
      customer.external_uid,
      user_email,
      {user_email, user_name, nil, customer.name}
    )
  end
end
