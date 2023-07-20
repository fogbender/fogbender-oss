defmodule Fog.Plug.DetectiveSession do
  import Plug.Conn

  def init(opts) do
    session =
      Plug.Session.init(
        store: :cookie,
        key: "_detective_session",
        # salts can be public, but it could be a good idea to change them from time to time
        encryption_salt: "AAETv-dxsUYZVfgvRSDE",
        signing_salt: "D7rdvJ7UTIzho7uFNLFa",
        key_length: 64,
        log: :debug
      )

    Keyword.merge([session: session], opts)
  end

  def call(conn, opts) do
    conn =
      put_in(
        conn.secret_key_base,
        Fog.env(:fog_detective_secret_key_base)
      )

    conn = Plug.Session.call(conn, opts[:session])

    if opts[:perform_manual_login] do
      conn
    else
      require_login(conn, opts)
    end
  end

  defp require_login(conn, _opts) do
    conn = fetch_session(conn)
    detective_id = get_session(conn, :detective_id)

    if detective_id != nil do
      assign(conn, :detective_id, detective_id)
    else
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(401, Jason.encode!(%{"error" => "not authorized"}))
      |> halt()
    end
  end
end
