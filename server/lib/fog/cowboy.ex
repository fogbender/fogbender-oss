defmodule Fog.Cowboy do
  require Logger
  use Plug.Router, origin: "*"

  if Mix.env() == :dev do
    use Plug.Debugger, otp_app: :fog
  end

  use Plug.ErrorHandler

  plug(Plug.Logger)
  plug(Fog.CORS)
  plug(:match)
  plug(:dispatch)

  get "/api/call" do
    send_resp(conn, 200, Jason.encode!(%{"test" => "Hello, Vendor!"}))
  end

  post "/api/submit_email_form" do
    {:ok, body, conn} = Plug.Conn.read_body(conn, opts)

    email_res =
      case Jason.decode(body) do
        {:ok, %{"email" => email}} when is_binary(email) ->
          case Fog.Validate.valid?(email) do
            true ->
              {:ok, email}

            false ->
              {:error, email}
          end

        _ ->
          {:error, body}
      end

    case email_res do
      {:ok, email} ->
        user_info = inspect([conn.remote_ip, get_req_header(conn, "user-agent")])
        # to make sure it fits into varchar 255
        user_info = String.slice(user_info, 0, 255)
        subscription_email = %Fog.Data.SubscriptionEmail{email: email, user_info: user_info}

        case Fog.Repo.insert(subscription_email) do
          {:ok, _} ->
            send_resp(conn, 200, Jason.encode!(%{"result" => "ok"}))

          error ->
            Logger.error("Failed to store subscription email to DB",
              email: email,
              error: inspect(error)
            )
        end

      _ ->
        send_resp(conn, 400, Jason.encode!(%{"error" => "email not found"}))
    end
  end

  get "/" do
    send_resp(conn, 200, Jason.encode!(%{"ok" => "ok"}))
  end

  get "/favicon.ico" do
    conn
    |> put_resp_content_type("image/x-icon")
    |> send_file(200, Path.join([:code.priv_dir(:fog), "static/favicon.ico"]))
  end

  forward("/export", to: Fog.Web.ExportRouter)

  forward("/auth", to: Fog.Web.AuthRouter)
  forward("/detective_auth", to: Fog.Web.DetectiveAuthRouter)

  forward("/detective_api", to: Fog.Web.DetectiveAPIRouter)
  # to skip the authentication check in /api
  forward("/api/client", to: Fog.Web.APIClientRouter)
  forward("/api", to: Fog.Web.APIRouter)

  forward("/vendor_api", to: Fog.Web.VendorApiRouter)

  forward("/s2s", to: Fog.Web.S2SRouter)

  forward("/public", to: Fog.Web.PublicRouter)

  forward("/hook", to: Fog.Integration.Hook)

  forward("/oauth", to: Fog.Web.OAuthRouter)

  forward("/tokens", to: Fog.Integration.Tokens)

  match _ do
    send_resp(conn, 404, "Nothing here... yet")
  end

  def handle_errors(conn, %{kind: _kind, reason: _reason, stack: _stack}) do
    send_resp(conn, conn.status, Jason.encode!(%{"error" => "something went wrong"}))
  end
end
