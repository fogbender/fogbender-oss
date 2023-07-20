defmodule Fog.Integration.Tokens do
  require Logger
  use Plug.Router
  plug(:match)
  plug(:fetch_query_params)
  plug(:dispatch)

  post "/" do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> widget_secret] ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        # hmac_digest requires `userId`
        data = Map.merge(data, %{userId: data["userId"]})

        %{
          user_hash: user_hash,
          user_jwt: user_jwt,
          user_paseto: user_paseto
        } = Fog.UserSignature.make_user_hashes(widget_secret, data)

        hashes = %{
          userHMAC: user_hash,
          userJWT: user_jwt,
          userPaseto: user_paseto
        }

        data = Map.merge(data, hashes)
        ok_json(conn, %{token: data} |> Jason.encode!())

      _ ->
        error_json_forbid(
          conn,
          %{
            error: %{
              message: "Invalid authorization header. Please use 'Authorization: Bearer <secret>'"
            }
          }
          |> Jason.encode!()
        )
    end
  end

  defp ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  defp error_json_forbid(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(403, data)
  end
end
