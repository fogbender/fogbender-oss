defmodule Fog.Llm.RoomServer do
  use GenServer

  require Logger

  alias Fog.{Api, Api.Event, Data, FileStorage, Llm, Repo}

  def start_link(room_id: room_id) do
    Llm.RoomSupervisor.start_room_server(room_id: room_id)
  end

  def schedule(cmd: cmd, message: %Data.Message{room_id: room_id} = message, sess: sess) do
    {:ok, pid} = Llm.RoomSupervisor.find_room_server(room_id: room_id)

    GenServer.cast(pid, {:handle, cmd: cmd, message: message, sess: sess})
  end

  def cancel_jobs(room_id: room_id) do
    {:ok, pid} = Llm.RoomSupervisor.find_room_server(room_id: room_id)

    GenServer.cast(pid, :cancel_jobs)
  end

  @impl true
  def init(state) do
    {:ok, state, {:continue, :post_init}}
  end

  @impl true
  def handle_continue(:post_init, %{room_id: room_id} = state) do
    room = Repo.Room.get(room_id) |> Repo.preload([:vendor, workspace: :llm_integrations])
    workspace = room.workspace

    llm_integrations =
      workspace.llm_integrations
      |> Enum.filter(& &1.enabled)

    case llm_integrations do
      [] ->
        {:stop, :normal, state}

      [llmi] ->
        assistant = Repo.Agent.get_bot_by_tag_name(llmi.workspace_id, llmi.assistant_id)
        assistant_sess = Api.Session.for_agent(room.vendor.id, assistant.id)

        new_state =
          state
          |> Map.merge(%{
            room: room,
            vendor_id: room.vendor.id,
            assistant_sess: assistant_sess,
            assistant_name: assistant.name,
            llmi: llmi,
            pending_messages: []
          })

        {:noreply, new_state}
    end
  end

  @impl true
  def handle_info({:cast, args}, state) do
    GenServer.cast(self(), args)
    {:noreply, state}
  end

  @impl true
  def handle_info({:cancel, message_id}, state) do
    %{room_id: room_id} = state

    :ok =
      Event.StreamReply.publish(%Event.StreamReply{
        roomId: room_id,
        messageId: message_id,
        text: nil
      })

    {:noreply, state}
  end

  @impl true
  def handle_info({:response_stream_chunk, message_id, chunk, relevance, run_server}, state) do
    %{
      room_id: room_id,
      assistant_sess: assistant_sess,
      assistant_name: assistant_name,
      room: room
    } = state

    if room.type === "dialog" or relevance >= 6 do
      start_typing(room_id, assistant_sess)

      chunk = chunk |> String.replace("\\n", "\n")

      chunk =
        if chunk == "" do
          "#{assistant_name}..."
        else
          Fog.Format.Md.parse(chunk)
          |> Fog.Format.Html.render()
        end

      :ok =
        Event.StreamReply.publish(%Event.StreamReply{
          roomId: room_id,
          messageId: message_id,
          text: chunk
        })
    else
      :ok = Llm.RunServer.cancel(run_server)
    end

    {:noreply, state}
  end

  @impl true
  def handle_info({:answer, message_id, answer, relevance}, state) do
    %{room_id: room_id, assistant_sess: assistant_sess, room: room} = state

    IO.inspect({"relevance", relevance})

    if room.type === "dialog" or relevance >= 6 do
      # XXX for some reason streaming responses contain double backslashes
      answer = answer |> String.replace("\\n", "\n")

      cmd = %Api.Message.Create{
        fromApp: "ai",
        roomId: room_id,
        fileIds: [],
        text: answer,
        linkRoomId: room_id,
        linkStartMessageId: message_id,
        linkEndMessageId: message_id,
        linkType: "reply"
      }

      {:reply, %Api.Message.Ok{messageId: _message_id}} =
        Api.Message.info(cmd, assistant_sess)
    end

    :ok =
      Event.StreamReply.publish(%Event.StreamReply{
        roomId: room_id,
        messageId: message_id,
        text: nil
      })

    stop_typing(room_id, assistant_sess)

    {:noreply, state}
  end

  @impl true
  def handle_info(_, state) do
    {:noreply, state}
  end

  @impl true
  def handle_cast(:cancel_jobs, state) do
    %{room_id: room_id, llmi: llmi} = state
    {:ok, jobs} = Llm.list_jobs(llmi, room_id)

    jobs
    |> Enum.each(fn job ->
      Logger.info("Cancelling #{job.run["id"]}")
      {:ok, _} = Llm.cancel_job(job)
    end)

    {:noreply, state}
  end

  @impl true
  def handle_cast(
        {:handle, cmd: _cmd, message: message, sess: sess} = args,
        %{room_id: room_id, llmi: llmi, pending_messages: pending_messages} = state
      ) do
    message = message |> Repo.preload(:files)
    %{id: message_id} = message

    :ok = maybe_upload_files(llmi, message)

    messages =
      case pending_messages do
        [%Data.Message{id: ^message_id} | _] ->
          pending_messages

        _ ->
          [message | pending_messages]
      end
      |> Enum.reverse()

    create_messages = fn
      f, [h | t] ->
        case Llm.create_message(llmi, h, sess) do
          {:ok, _} ->
            f.(f, t)

          {:error, :busy} ->
            {:ok, jobs} = Llm.list_jobs(llmi, room_id)

            # XXX debug
            jobs
            |> Enum.each(fn %{run: run} ->
              IO.inspect(run["status"])
            end)

            {:retry, t |> Enum.reverse()}
        end

      _, [] ->
        :ok
    end

    case create_messages.(create_messages, messages) do
      :ok ->
        Process.send(self(), {:cast, {:create_job, message_id}}, [])
        {:noreply, %{state | pending_messages: []}}

      {:retry, messages} ->
        Process.send_after(self(), {:cast, args}, 500)
        {:noreply, %{state | pending_messages: messages}}
    end
  end

  @impl true
  def handle_cast({:create_job, message_id}, state) do
    IO.inspect("create_job")
    %{room_id: room_id, llmi: llmi} = state

    Llm.RunServer.create(
      room_id: room_id,
      message_id: message_id,
      llmi: llmi,
      room_server: self()
    )

    {:noreply, state}
  end

  @impl true
  def handle_cast(:stop_typing, state) do
    %{room_id: room_id, assistant_sess: assistant_sess} = state
    IO.inspect("STOPPING TYPING")
    stop_typing(room_id, assistant_sess)
    {:noreply, state}
  end

  @impl true
  def handle_cast(cmd, %{room_id: _} = state) when map_size(state) === 1 do
    Process.send(self(), {:cast, cmd}, [])
    handle_continue(:post_init, state)
  end

  @impl true
  def handle_cast(_, state) do
    {:noreply, state}
  end

  def start_typing(room_id, assistant_sess) do
    typing_cmd = %Api.Typing.Set{
      roomId: room_id
    }

    {:ok, _} = Api.Typing.info(typing_cmd, assistant_sess)
  end

  def stop_typing(room_id, assistant_sess) do
    {:ok, _} = Api.Typing.info({:reset_typing, room_id}, assistant_sess)
  end

  defp maybe_upload_files(_llmi, %Data.Message{files: []}) do
    :ok
  end

  defp maybe_upload_files(llmi, %Data.Message{files: files}) do
    files
    |> Enum.each(fn file ->
      %Fog.Data.File{
        filename: filename,
        # content_type: content_type,
        data: data
      } = file

      file_path = data["file_s3_file_path"]
      {:ok, file_body} = FileStorage.read(file_path)

      :ok =
        Llm.upload_file(
          llmi: llmi,
          filename: filename,
          file_body: file_body,
          file: file
        )
    end)

    :ok
  end
end
