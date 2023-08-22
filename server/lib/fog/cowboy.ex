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

  get "/" do
    send_resp(conn, 200, Jason.encode!(%{"ok" => "ok"}))
  end

  get "/favicon.ico" do
    conn
    |> put_resp_content_type("image/x-icon")
    |> send_file(200, Path.join([:code.priv_dir(:fog), "static/favicon.ico"]))
  end

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

  forward("/files", to: Fog.Web.LocalFilesRouter)

  match _ do
    send_resp(conn, 404, "Nothing here... yet")
  end

  def handle_errors(conn, %{kind: _kind, reason: _reason, stack: _stack}) do
    send_resp(conn, conn.status, Jason.encode!(%{"error" => "something went wrong"}))
  end
end
