defmodule Fog.Comms.Slack.Agent.RoomSupervisor do
  use DynamicSupervisor

  def start_link(arg) do
    DynamicSupervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def find_room_server(room_id: room_id) do
    child_spec = %{
      id: {:slack_room_server, room_id},
      start: {Fog.Comms.Slack.Agent.RoomServer, :start_link, [[room_id: room_id]]},
      restart: :transient
    }

    case Registry.whereis_name({Registry.Fogbender, {:slack_room_server, room_id}}) do
      :undefined ->
        case DynamicSupervisor.start_child(__MODULE__, child_spec) do
          {:ok, pid} ->
            if Code.ensure_loaded?(Mix) and function_exported?(Mix, :env, 0) and
                 Mix.env() == :test do
              Ecto.Adapters.SQL.Sandbox.allow(Fog.Repo, self(), pid)
            end

            {:ok, pid}

          {:error, {:already_started, pid}} ->
            {:ok, pid}
        end

      pid ->
        {:ok, pid}
    end
  end
end
