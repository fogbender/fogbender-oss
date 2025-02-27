defmodule Fog.Llm.RunServer do
  use GenServer

  require Logger

  alias Fog.{Llm, Json.StreamingParser}

  # 2 hours = 2 * 60 * 60 * 1000 = 7,200,000 milliseconds
  @inactivity_timeout 7_200_000

  def start_link(args) do
    Llm.RoomSupervisor.start_run_server(args)
  end

  def create(room_id: room_id, message_id: message_id, llmi: llmi, room_server: room_server) do
    {:ok, pid} =
      Llm.RoomSupervisor.find_or_start_run_server(
        room_id: room_id,
        message_id: message_id,
        llmi: llmi,
        room_server: room_server
      )

    GenServer.cast(pid, :create)
  end

  def cancel(pid) do
    GenServer.cast(pid, :cancel)
  end

  @impl true
  def init(state) when is_map(state) do
    state =
      state
      |> Map.put_new(:parser, StreamingParser.new())
      |> Map.put_new(:job, nil)

    {:ok, state, @inactivity_timeout}
  end

  @impl true
  def handle_cast(:create, state) do
    %{room_id: room_id, llmi: llmi} = state

    our_pid = self()

    Task.start(fn ->
      Llm.create_run(llmi, room_id, fn result ->
        Process.send(our_pid, {:cast, {:on_run_result, result}}, [])
      end)
    end)

    {:noreply, state, @inactivity_timeout}
  end

  @impl true
  def handle_cast(:cancel, state) do
    %{job: job} = state

    {:ok, _} = Llm.cancel_job(job)

    {:noreply, state, @inactivity_timeout}
  end

  @impl true
  def handle_cast({:on_run_result, {:stream_delta, piece}}, state) do
    %{
      message_id: message_id,
      parser: parser,
      room_server: room_server
    } = state

    parser = StreamingParser.add_chunk(parser, piece)
    response = StreamingParser.path(parser, ["response"])
    relevance = StreamingParser.path(parser, ["assistant_response_relevance"])

    case {response, relevance} do
      {{:partial, chunk}, {:number, relevance}} ->
        Process.send(
          room_server,
          {:response_stream_chunk, message_id, chunk, relevance, self()},
          []
        )

      _ ->
        :ok
    end

    {:noreply, %{state | parser: parser}, @inactivity_timeout}
  end

  @impl true
  def handle_cast({:on_run_result, {:ok, job}}, state) do
    {:ok, _} = Llm.cancel_job(job)

    %{
      message_id: message_id,
      parser: parser,
      room_server: room_server
    } = state

    {:number, relevance} = StreamingParser.path(parser, ["assistant_response_relevance"])
    {:ok, response} = StreamingParser.path(parser, ["response"])

    Process.send(room_server, {:answer, message_id, response, relevance}, [])

    {:noreply, state, @inactivity_timeout}
  end

  @impl true
  def handle_cast({:on_run_result, {:cancelled, job}}, state) do
    %{
      message_id: message_id,
      room_server: room_server
    } = state

    Process.send(room_server, {:cancel, message_id}, [])

    {:noreply, %{state | job: job}, @inactivity_timeout}
  end

  @impl true
  def handle_cast({:on_run_result, {:pending, job}}, state) do
    {:noreply, %{state | job: job}, @inactivity_timeout}
  end

  @impl true
  def handle_info({:cast, args}, state) do
    GenServer.cast(self(), args)
    {:noreply, state, @inactivity_timeout}
  end

  def handle_info(:timeout, state) do
    {:stop, :normal, state}
  end

  @impl true
  def handle_info(_, state) do
    {:noreply, state, @inactivity_timeout}
  end
end
