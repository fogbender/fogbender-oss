defmodule Fog.Web.MultiplayerDemoDialog do
  import Ecto.Query, only: [from: 2]

  use GenServer

  alias Fog.{Api, Data, Repo}

  require Logger

  @script [
    %{mnum: :m0, sess_name: :alice_sess, text: "Hi Bob"},
    %{mnum: :m1, sess_name: :bob_sess, text: "Hi Alice"},
    %{mnum: :m2, sess_name: :alice_sess, text: "How are things?"},
    %{mnum: :m3, sess_name: :bob_sess, text: "Not too bad!"},
    %{mnum: :m4, sess_name: :bob_sess, text: "Actually, awful :(", reply: %{from: :m2, to: :m2}},
    %{
      mnum: :m5,
      sess_name: :alice_sess,
      text: "Which one is the haunted house we’ll be using, do you know?",
      files: ["haunted_house_00.jpg", "haunted_house_01.jpg", "haunted_house_02.jpg"]
    },
    %{
      mnum: :m6,
      sess_name: :bob_sess,
      text: "Are you sure we should be talking about this here, in support chat?",
      dm: true
    },
    %{mnum: :m7, sess_name: :alice_sess, text: "This chat is so good though!", dm: true}
  ]

  @min_interval 500
  @max_interval 2000

  def child_spec(workspace, helpdesk_id, users, triage) do
    %{
      id: __MODULE__,
      start:
        {__MODULE__, :start_link,
         [workspace: workspace, helpdesk_id: helpdesk_id, users: users, triage: triage]},
      type: :worker,
      restart: :transient
    }
  end

  def start_link(workspace: workspace, helpdesk_id: helpdesk_id, users: users, triage: triage) do
    GenServer.start_link(
      __MODULE__,
      %{
        workspace: workspace,
        helpdesk_id: helpdesk_id,
        users: users,
        triage: triage,
        cur_message_index: 0,
        messages_map: %{}
      },
      name: {:via, Registry, {Registry.MultiplayerDemoDialog, helpdesk_id}}
    )
  end

  def play(pid) do
    GenServer.cast(pid, :play)
  end

  def stop(pid) do
    GenServer.stop(pid, :normal, 5000)
  end

  def clear(pid) do
    GenServer.cast(pid, :clear)
  end

  @impl true
  def init(state) do
    {:ok, state, {:continue, :post_init}}
  end

  @impl true
  def handle_continue(:post_init, state) do
    schedule_next_message(self(), state)
  end

  @impl true
  def handle_cast(:play, state) do
    schedule_next_message(self(), %{state | cur_message_index: 0, messages_map: %{}})
  end

  @impl true
  def handle_cast(
        :clear,
        %{workspace: workspace, helpdesk_id: helpdesk_id, triage: triage} = state
      ) do
    workspace = Repo.Workspace.get(workspace.id) |> Repo.preload([:vendor, :integrations])

    case workspace.integrations |> Enum.find(&(&1.type === "slack")) do
      %Data.WorkspaceIntegration{
        specifics: %{"access_token" => access_token, "linked_channel_id" => linked_channel_id}
      } ->
        slack_messages =
          from(
            sm in Data.SlackMessageMapping,
            join: m in Data.Message,
            on: sm.message_id == m.id and m.room_id == ^triage.id,
            where: sm.slack_channel_id == ^linked_channel_id
          )
          |> Repo.all()

        slack_messages
        |> Enum.each(fn slack_message ->
          Fog.Comms.Slack.Api.delete_message(
            access_token,
            linked_channel_id,
            slack_message.slack_message_ts
          )
        end)

        slack_threads =
          from(
            st in Data.SlackChannelMapping,
            where: st.channel_id == ^linked_channel_id,
            where: st.room_id == ^triage.id
          )
          |> Repo.all()

        slack_threads
        |> Enum.each(fn slack_thread ->
          Fog.Comms.Slack.Api.delete_message(
            access_token,
            linked_channel_id,
            slack_thread.thread_id
          )
        end)

        from(
          sm in Data.SlackMessageMapping,
          join: m in Data.Message,
          on: sm.message_id == m.id and m.room_id == ^triage.id,
          where: sm.slack_channel_id == ^linked_channel_id
        )
        |> Repo.delete_all()

        from(
          st in Data.SlackChannelMapping,
          where: st.channel_id == ^linked_channel_id,
          where: st.room_id == ^triage.id
        )
        |> Repo.delete_all()

        :ok

      true ->
        :ok
    end

    dialog = get_dialog(state)

    [triage.id, dialog.id]
    |> Enum.each(fn room_id ->
      {_, _} =
        from(
          m in Data.Message,
          where: m.room_id == ^room_id
        )
        |> Repo.delete_all()

      {_, _} =
        from(
          rt in Data.RoomTag,
          where: rt.room_id == ^room_id
        )
        |> Repo.delete_all()

      {_, _} =
        from(
          rt in Data.Seen,
          where: rt.room_id == ^room_id
        )
        |> Repo.delete_all()

      {_, _} =
        from(
          rt in Data.MessageLink,
          where: rt.target_room_id == ^room_id
        )
        |> Repo.delete_all()
    end)

    Fog.Repo.Room.delete(dialog.id)

    [
      %{workspace_id: workspace.id},
      %{helpdesk_id: helpdesk_id}
    ]
    |> Enum.each(fn ctx ->
      Fog.Api.Event.Control.publish(:reload, ctx)
    end)

    {:noreply, state}
  end

  @impl true
  def handle_info(
        :next_message,
        %{
          cur_message_index: index,
          triage: triage,
          users: users,
          messages_map: messages_map
        } =
          state
      ) do
    verse = Enum.at(@script, index)

    %{mnum: mnum, sess_name: sess_name, text: text} = verse

    sess = users[sess_name]

    {link_room_id, link_start_message_id, link_end_message_id, link_type} =
      case verse do
        %{reply: %{from: from, to: to}} ->
          link_start_message_id = Map.fetch!(messages_map, from)
          link_end_message_id = Map.fetch!(messages_map, to)

          {triage.id, link_start_message_id, link_end_message_id, "reply"}

        _ ->
          {nil, nil, nil, nil}
      end

    files = verse |> Map.get(:files, [])

    room = get_room(state)

    {:ok, message_id} =
      post_message(
        room,
        text,
        sess,
        files,
        link_room_id,
        link_start_message_id,
        link_end_message_id,
        link_type
      )

    state = %{state | messages_map: Map.put(state.messages_map, mnum, message_id)}
    stop_typing(triage, sess)

    if index + 1 === length(@script) do
      # {:stop, :normal, state}
      {:noreply, state}
    else
      schedule_next_message(self(), %{state | cur_message_index: index + 1})
    end
  end

  @impl true
  def handle_info(msg, state) do
    IO.inspect({"Unknown message", msg})
    {:noreply, state}
  end

  defp schedule_next_message(
         pid,
         %{cur_message_index: index, users: users} = state
       ) do
    verse = @script |> Enum.at(index)
    %{sess_name: sess_name} = verse
    sess = users[sess_name]

    room = get_room(state)

    {:ok, _} = start_typing(room, sess)
    delay = :rand.uniform(@max_interval - @min_interval) + @min_interval

    Process.send_after(pid, :next_message, delay)

    {:noreply, state}
  end

  defp start_typing(room, sess) do
    typing_cmd = %Api.Typing.Set{
      roomId: room.id
    }

    {:ok, _} = Api.Typing.info(typing_cmd, sess)
  end

  defp stop_typing(room, sess) do
    {:ok, _} = Api.Typing.info({:reset_typing, room.id}, sess)
  end

  defp post_message(
         room,
         text,
         sess,
         files,
         link_room_id,
         link_start_message_id,
         link_end_message_id,
         link_type
       ) do
    {:ok, file_ids} = upload_files(files, room.id, sess)

    cmd = %Api.Message.Create{
      fromApp: "ai",
      roomId: room.id,
      fileIds: file_ids,
      linkRoomId: link_room_id,
      linkStartMessageId: link_start_message_id,
      linkEndMessageId: link_end_message_id,
      linkType: link_type,
      text: text
    }

    {:reply, %Api.Message.Ok{messageId: message_id}} = Api.Message.info(cmd, sess)

    {:ok, message_id}
  end

  defp upload_files(files, room_id, sess) do
    file_ids =
      case files do
        nil ->
          []

        _ ->
          files
          |> Enum.map(fn file ->
            binary =
              File.read!(Path.join([:code.priv_dir(:fog), "static/multiplayer_demo/#{file}"]))

            cmd = %Api.File.Upload{
              roomId: room_id,
              fileName: file,
              fileType: "image/jpeg",
              binaryData: {0, binary}
            }

            {:reply, %Fog.Api.File.Ok{fileId: file_id}} = Api.File.info(cmd, sess)

            file_id
          end)
      end

    {:ok, file_ids}
  end

  defp get_room(
         %{
           triage: triage,
           cur_message_index: index
         } = state
       ) do
    verse = Enum.at(@script, index)

    case verse do
      %{dm: true} ->
        get_dialog(state)

      _ ->
        triage
    end
  end

  defp get_dialog(%{
         helpdesk_id: helpdesk_id,
         users: users
       }) do
    Repo.Room.create_dialog(
      users
      |> Map.values()
      |> Enum.filter(fn
        %Data.User{} ->
          true

        _ ->
          false
      end)
      |> Enum.map(& &1.id),
      helpdesk_id: helpdesk_id
    )
  end
end
