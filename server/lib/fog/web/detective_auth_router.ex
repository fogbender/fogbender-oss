defmodule Fog.Web.DetectiveAuthRouter do
  use Plug.Router

  plug(:match)
  plug(:fetch_query_params)
  plug(Fog.Plug.DetectiveSession, perform_manual_login: true)
  plug(Ueberauth)
  plug(:dispatch)

  get "/google/test" do
    conn = fetch_session(conn)
    x = get_session(conn)
    conn = put_session(conn, :test, :ok)

    user =
      with %{token: token} <- x["ueberauth"] do
        path = "https://www.googleapis.com/oauth2/v3/userinfo"

        case Ueberauth.Strategy.Google.OAuth.get(token, path) do
          {:ok, %{body: %{"email" => email}}} ->
            email

          {:error, %{status_code: 401}} ->
            "google token expired"
        end
      end

    send_resp(conn, 200, "OK #{user} #{inspect(x)}")
  end

  get "/google/signout" do
    conn = fetch_session(conn)
    conn = clear_session(conn)
    send_resp(conn, 200, "OK SIGN OUT")
  end

  match _ do
    auth = Ueberauth.auth(conn)

    if auth do
      conn = fetch_session(conn)
      email = auth.info.email
      detective = Fog.Repo.get_by(Fog.Data.Detective, email: email)

      if detective do
        conn = fetch_session(conn)
        conn = put_session(conn, :ueberauth, auth.credentials)

        conn = put_session(conn, :detective_id, detective.id)

        send_resp(conn, 200, "DONE #{email}")
      else
        send_resp(conn, 401, "I don't recognize you")
      end
    else
      if conn.assigns[:ueberauth_failure] do
        send_resp(conn, 400, "Failed to sign in")
      else
        send_resp(conn, 404, "Not found")
      end
    end
  end
end
