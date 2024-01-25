defmodule Fog.Plug.AgentSession do
  import Plug.Conn

  def session() do
    host =
      case Fog.env(:fog_api_url) do
        nil ->
          nil

        url ->
          URI.parse(url).host
      end

    Plug.Session.init(
      store: :cookie,
      key: "_store_session",
      same_site: "None",
      domain: host,
      secure: true,
      # salts can be public, but it could be a good idea to change them from time to time
      encryption_salt: "37BbUPIWmTQ493DPJgnk",
      signing_salt: "JwjmCN7i0RzPi6V9PivX",
      log: :debug,
      # Set session for a month, in seconds
      max_age: 60 * 60 * 24 * 30
    )
  end

  def secret_key_base() do
    Fog.env(:fog_secret_key_base)
  end

  def init(opts) do
    session = session()
    Keyword.merge([session: session], opts)
  end

  def call(conn, opts) do
    conn =
      put_in(
        conn.secret_key_base,
        secret_key_base()
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
    agent_id = get_session(conn, :agent_id)

    if agent_id != nil do
      assign(conn, :agent_id, agent_id)
    else
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(401, Jason.encode!(%{"error" => "not authorized"}))
      |> halt()
    end
  end
end
