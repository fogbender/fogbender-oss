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

  get "/api/avatar_cache/:avatar_url" do
    avatar_url = URI.decode(avatar_url)
    {content_type, response} = Fog.Web.AvatarCache.handle_avatar_request(avatar_url)

    conn
    |> put_resp_content_type(content_type)
    |> send_resp(200, response)
  end

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
  # _internal_ vendor API
  forward("/api/vendors", to: Fog.Web.ApiVendorRouter)
  forward("/api/customers", to: Fog.Web.ApiHelpdeskRouter)
  forward("/api/helpdesks", to: Fog.Web.ApiHelpdeskRouter)
  forward("/api/invites", to: Fog.Web.ApiInvitesRouter)
  forward("/api/vendor_invites", to: Fog.Web.ApiVendorInvitesRouter)
  forward("/api", to: Fog.Web.APIRouter)

  forward("/multiplayer-demo-dialog", to: Fog.Web.MultiplayerDemoDialogRouter)

  # this is the _external_ vendor API
  forward("/vendor_api", to: Fog.Web.VendorApiRouter)

  forward("/s2s", to: Fog.Web.S2SRouter)

  forward("/public", to: Fog.Web.PublicRouter)

  forward("/hook", to: Fog.Integration.Hook)

  forward("/oauth", to: Fog.Web.OAuthRouter)

  # deprecated
  forward("/tokens", to: Fog.Integration.Signatures)

  # /signatures replaces /tokens
  forward("/signatures", to: Fog.Integration.Signatures)

  forward("/files", to: Fog.Web.LocalFilesRouter)

  match _ do
    send_resp(conn, 404, "Nothing here... yet")
  end

  defp handle_errors(conn, %{kind: _kind, reason: _reason, stack: stack}) do
    Logger.error("#{inspect(stack)}")
    send_resp(conn, conn.status, Jason.encode!(%{"error" => "something went wrong"}))
  end
end
