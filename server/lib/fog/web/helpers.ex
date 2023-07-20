defmodule Fog.Web.Helpers do
  import Plug.Conn

  def send_not_found_json(conn, data \\ %{"error" => "Not found"}) do
    send_error_json(conn, 404, data)
  end

  def send_bad_request_json(conn, data) do
    send_error_json(conn, 400, data)
  end

  def send_forbid_json(conn, data) do
    send_error_json(conn, 403, data)
  end

  def send_not_authorized_json(conn, data \\ %{"error" => "Not authorized"}) do
    send_error_json(conn, 401, data)
  end

  def send_ok_no_content(conn) do
    conn |> send_resp(204, "")
  end

  def send_ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, Jason.encode!(data))
  end

  defp send_error_json(conn, code, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(code, Jason.encode!(data))
    |> halt()
  end
end
