defmodule Fog.Web.LocalFilesRouter do
  require Logger
  import Fog.Web.Helpers
  import Plug.Conn
  use Plug.Router

  plug(:check_files_enabled)
  plug(:match)
  plug(:fetch_query_params)
  plug(:check_file_token)
  plug(:dispatch)

  get "/:file_path" do
    file_path = conn.params["file_path"]

    case Fog.FileStorage.Local.read(file_path) do
      {:ok, file_binary} ->
        conn
        |> maybe_add_download_header()
        |> send_resp(200, file_binary)

      {:error, error} ->
        send_not_found_json(conn, error)
    end
  end

  match(_, do: send_not_found_json(conn))

  defp check_files_enabled(conn, _opts) do
    case Fog.env(:file_storage) do
      "local" -> conn
      _ -> send_not_found_json(conn)
    end
  end

  defp check_file_token(conn, _) do
    token = conn.params["token"]
    file_path = conn.params["file_path"]

    case Fog.FileStorage.Local.token_valid?(token, file_path) do
      true -> conn
      false -> send_not_authorized_json(conn)
    end
  end

  defp maybe_add_download_header(conn) do
    params = conn.params

    case {params["download"], params["file_name"]} do
      {"true", file_name} when is_binary(file_name) and file_name != "" ->
        put_resp_header(conn, "Content-Disposition", "attachment; filename=\"#{file_name}\"")

      _ ->
        conn
    end
  end
end
