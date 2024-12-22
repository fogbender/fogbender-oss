defmodule Fog.Comms.Slack.Agent.RoomServer do
  use GenServer

  require Logger

  alias Fog.{Data}
  alias Fog.Comms.Slack.{Agent}

  def start_link(room_id: room_id) do
    GenServer.start_link(__MODULE__, %{},
      name: {:via, Registry, {Registry.Fogbender, {:slack_room_server, room_id}}}
    )
  end

  def schedule(cmd: cmd, message: %Data.Message{room_id: room_id} = message, sess: sess) do
    {:ok, pid} = Agent.RoomSupervisor.find_room_server(room_id: room_id)
    GenServer.cast(pid, {:handle, cmd: cmd, message: message, sess: sess})
  end

  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_cast({:handle, params}, state) do
    Agent.MessageTask.run(params)
    {:noreply, state}
  end
end
