defmodule Fog.Llm.RoomSupervisor do
  use DynamicSupervisor

  def start_link(arg) do
    DynamicSupervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  # run server
  def start_run_server(
        room_id: room_id,
        message_id: message_id,
        llmi: llmi,
        room_server: room_server
      ) do
    GenServer.start_link(
      Fog.Llm.RunServer,
      %{room_id: room_id, message_id: message_id, llmi: llmi, room_server: room_server},
      name: {:via, Registry, {Registry.Fogbender, {:llm_run_server, room_id, message_id}}}
    )
  end

  def find_run_server(
        room_id: room_id,
        message_id: message_id
      ) do
    case Registry.whereis_name({Registry.Fogbender, {:llm_run_server, room_id, message_id}}) do
      :undefined ->
        nil

      pid ->
        {:ok, pid}
    end
  end

  def find_or_start_run_server(
        room_id: room_id,
        message_id: message_id,
        llmi: llmi,
        room_server: room_server
      ) do
    child_spec = %{
      id: {:llm_run_server, room_id, message_id},
      start:
        {Fog.Llm.RunServer, :start_link,
         [[room_id: room_id, message_id: message_id, llmi: llmi, room_server: room_server]]},
      restart: :transient
    }

    case Registry.whereis_name({Registry.Fogbender, {:llm_run_server, room_id, message_id}}) do
      :undefined ->
        case DynamicSupervisor.start_child(__MODULE__, child_spec) do
          {:ok, pid} ->
            {:ok, pid}

          {:error, {:already_started, pid}} ->
            {:ok, pid}
        end

      pid ->
        {:ok, pid}
    end
  end

  # room server
  def start_room_server(room_id: room_id) do
    GenServer.start_link(Fog.Llm.RoomServer, %{room_id: room_id},
      name: {:via, Registry, {Registry.Fogbender, {:llm_room_server, room_id}}}
    )
  end

  def find_room_server(room_id: room_id) do
    child_spec = %{
      id: {:llm_room_server, room_id},
      start: {Fog.Llm.RoomServer, :start_link, [[room_id: room_id]]},
      restart: :transient
    }

    case Registry.whereis_name({Registry.Fogbender, {:llm_room_server, room_id}}) do
      :undefined ->
        case DynamicSupervisor.start_child(__MODULE__, child_spec) do
          {:ok, pid} ->
            {:ok, pid}

          {:error, {:already_started, pid}} ->
            {:ok, pid}
        end

      pid ->
        {:ok, pid}
    end
  end
end
