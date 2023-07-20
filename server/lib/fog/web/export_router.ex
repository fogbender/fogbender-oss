defmodule Fog.Web.ExportRouter do
  import Ecto.Query, only: [select: 3]

  use Plug.Router
  plug(:match)
  plug(:fetch_query_params)
  plug(:check_export_key)
  plug(:dispatch)

  get "/emails.csv" do
    fields = [:email, :user_info, :inserted_at]

    data =
      Fog.Data.SubscriptionEmail
      |> select([e], ^fields)
      |> Fog.Repo.all()
      |> Fog.Utils.maps_to_csv(fields)
      |> Enum.to_list()

    conn
    |> put_resp_content_type("application/csv")
    |> send_resp(200, data)
  end

  match _ do
    send_resp(conn, 404, "Not found")
  end

  defp check_export_key(conn, _opts) do
    if key_valid?(conn) do
      conn
    else
      conn
      |> send_resp(401, "Invalid key")
      |> halt()
    end
  end

  defp key_valid?(conn) do
    conn.params["key"] == Fog.env(:api_export_key)
  end
end
