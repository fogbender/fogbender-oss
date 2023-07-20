defmodule Fog.Api.Transport.Ws do
  require Logger
  alias Fog.Api

  def init(req, _opts) do
    {:cowboy_websocket, req, req, %{compress: true, idle_timeout: 60_000}}
  end

  def websocket_init(req) do
    Logger.debug("#{__MODULE__} connected")

    session =
      case agent_session(req) do
        {:ok, agent_id} ->
          Api.Session.guest_agent(agent_id)

        _ ->
          Api.Session.guest()
      end

    {:ok, Api.init(session)}
  end

  def websocket_handle({:text, encoded}, state) do
    Api.request(:json, :json, encoded, state)
    |> response()
  end

  def websocket_handle({:binary, encoded}, state) do
    Api.request(:bson, :json, encoded, state)
    |> response()
  end

  def websocket_handle(_ping, state) do
    {:ok, state}
  end

  def websocket_info({'EXIT', _, :normal}, state) do
    {:ok, state}
  end

  def websocket_info(message, state) do
    Api.info(:raw, :json, message, state)
    |> response()
  end

  defp agent_session(req) do
    conn = %{secret_key_base: Fog.Plug.AgentSession.secret_key_base()}
    session = Fog.Plug.AgentSession.session()
    opts = session.store_config
    cookies = :cowboy_req.parse_cookies(req)

    with {_, cookie} <- List.keyfind(cookies, "_store_session", 0),
         {:term, %{"agent_id" => agent_id}} <- Plug.Session.COOKIE.get(conn, cookie, opts) do
      {:ok, agent_id}
    else
      _ -> false
    end
  end

  defp response({:ok, s}) do
    {:ok, s}
  end

  defp response({:reply, encoded, s}) when is_list(encoded) do
    out_frames = Enum.map(encoded, &{:text, &1})
    {:reply, out_frames, s}
  end

  defp response({:reply, encoded, s}), do: {:reply, {:text, encoded}, s}
end
