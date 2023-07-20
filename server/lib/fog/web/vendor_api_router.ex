defmodule Fog.Web.VendorApiRouter do
  import Fog.Web.Helpers
  use Plug.Router
  require Logger

  plug(:match)
  plug(Fog.Plug.TokenAuth)
  plug(:fetch_query_params)
  plug(:check_vendor)
  plug(:check_scopes)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(:dispatch)

  post "/:vendor_id/customers", assigns: %{scope: "customer:update"} do
    data = conn.body_params
    Fog.Repo.Vendor.update_customers_info(conn.params["vendor_id"], data)
    send_ok_json(conn, [])
  end

  match _ do
    send_not_found_json(conn)
  end

  defp check_scopes(%{assigns: %{scope: scope}} = conn, _opts) do
    if scope in conn.assigns[:token_scopes] do
      conn
    else
      send_forbid_json(conn, %{"error" => "Invalid scopes"})
    end
  end

  defp check_scopes(conn, _), do: conn

  defp check_vendor(%{params: %{"vendor_id" => vendor_id}} = conn, _opts) do
    if vendor_id == conn.assigns[:token_vendor_id] do
      conn
    else
      send_forbid_json(conn, %{"error" => "Invalid vendor"})
    end
  end

  defp check_vendor(conn, _), do: conn
end
