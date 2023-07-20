defmodule Fog.Plug.TokenAuth do
  import Plug.Conn
  import Fog.Web.Helpers
  require Logger
  alias Fog.Data

  def init(opts), do: opts

  def call(conn, _opts) do
    conn
    |> get_auth_header()
    |> read_token()
  end

  defp get_auth_header(conn) do
    case get_req_header(conn, "authorization") do
      [token] -> {conn, token}
      _ -> {conn}
    end
  end

  defp read_token({conn, "Bearer " <> token}) do
    case Fog.Repo.VendorApiToken.check(token) do
      {:ok, %Data.VendorApiToken{vendor_id: vendor_id, scopes: scopes}} ->
        conn
        |> assign(:token_vendor_id, vendor_id)
        |> assign(:token_scopes, scopes)

      {:error, error} ->
        Logger.warn("Invalid token: #{token} (#{inspect(error)})")
        send_not_authorized_json(conn, %{"error" => "Invalid token"})
    end
  end

  defp read_token({conn, _}) do
    send_not_authorized_json(conn, %{"error" => "Invalid authorization header"})
  end

  defp read_token({conn}) do
    send_not_authorized_json(conn, %{"error" => "No authorization header"})
  end
end
