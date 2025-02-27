defmodule Fog.Api.Message do
  import Ecto.Query, only: [from: 2]

  use Fog.Api.Handler
  alias Fog.{Data, Repo}
  alias Fog.Api.{Session, Event, Perm}

  defmsg(Mention, [:id, :text])

  defmsg(Create, [
    :roomId,
    :text,
    :clientId,
    :fileIds,
    :fromApp,
    :linkRoomId,
    :linkStartMessageId,
    :linkEndMessageId,
    :linkType,
    # [%Mention{}]
    :mentions,
    :fromNameOverride,
    :fromAvatarUrlOverride,
    :source
  ])

  defmsg(CreateMany, [
    :messages
  ])

  defmsg(Update, [
    :messageId,
    :text,
    :fromApp,
    :linkRoomId,
    :linkStartMessageId,
    :linkEndMessageId,
    :linkType,
    # [user_id || agent_id]
    :mentions,
    :fileIds
  ])

  defmsg(Seen, [
    :messageId,
    :roomId
  ])

  defmsg(Unseen, [
    :roomId
  ])

  defmsg(GetSources, [
    :messageId
  ])

  defmsg(SetReaction, [
    :fromApp,
    :messageId,
    :reaction
  ])

  defmsg(RefreshFiles, [
    :messageId
  ])

  @commands [Create, CreateMany, Update, Seen, Unseen, GetSources, SetReaction, RefreshFiles]

  defmsg(Ok, [:messageId, :messageIds, :items])
  deferr(Err, [])

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    if auth(m, s) do
      case m do
        %Seen{} ->
          {:ok, seen} = handle_command(m, s)
          :ok = Event.publish(seen)
          {:reply, %Ok{messageId: seen.message_id}}

        %Unseen{} ->
          {:ok, seen} = handle_command(m, s)
          :ok = Event.publish(seen)
          {:reply, %Ok{}}

        %CreateMany{} ->
          {:ok, res} = handle_command(m, s)

          messageIds =
            res
            |> Enum.map(fn {:ok, message, sources} ->
              :ok = Event.publish(message)
              sources |> Enum.map(&(:ok = Event.publish(&1)))
              message.id
            end)

          {:reply, %Ok{messageIds: messageIds}}

        %SetReaction{} ->
          {:ok, message} = handle_command(m, s)
          :ok = Event.publish(message)
          {:reply, %Ok{}}

        %GetSources{messageId: id} ->
          message =
            Repo.Message.get(id)
            |> Event.Message.preload()
            |> Event.Message.from_data()

          {:reply, %Ok{items: message.sources}}

        _ ->
          {:ok, message, sources} = handle_command(m, s)

          :ok = Event.publish(message)

          sources |> Enum.map(&(:ok = Event.publish(&1)))

          {:reply, %Ok{messageId: message.id}}
      end
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp auth(%Create{roomId: room_id, linkRoomId: link_room_id}, sess) do
    Perm.Message.allowed?(sess, :create, room_id: room_id, link_room_id: link_room_id)
  end

  defp auth(%CreateMany{messages: messages}, sess) do
    messages
    |> Enum.all?(&auth(&1, sess))
  end

  defp auth(%Update{messageId: id, linkRoomId: link_room_id}, sess) do
    Perm.Message.allowed?(sess, :update, message_id: id, link_room_id: link_room_id)
  end

  defp auth(%Seen{roomId: id}, sess) do
    Perm.Room.allowed?(sess, :read, room_id: id)
  end

  defp auth(%Unseen{roomId: id}, sess) do
    Perm.Room.allowed?(sess, :read, room_id: id)
  end

  defp auth(%GetSources{messageId: id}, sess) do
    Perm.Message.allowed?(sess, :read, message_id: id)
  end

  defp auth(%SetReaction{messageId: id}, sess) do
    Perm.Message.allowed?(sess, :read, message_id: id)
  end

  defp auth(%RefreshFiles{messageId: id}, sess) do
    Perm.Message.allowed?(sess, :read, message_id: id)
  end

  defp handle_command(%Create{} = m, sess), do: handle_create(m, sess)

  defp handle_command(%CreateMany{messages: messages}, sess) do
    Repo.transaction(fn ->
      Enum.map(messages, fn m ->
        handle_create(m, sess)
      end)
    end)
  end

  defp handle_command(
         %Update{
           messageId: messageId,
           text: nil,
           linkRoomId: nil,
           linkStartMessageId: nil,
           linkEndMessageId: nil,
           linkType: nil
         } = cmd,
         sess
       ) do
    sources =
      from(l in Data.MessageLink,
        where: l.target_message_id == ^messageId,
        select: l.source_message_id
      )
      |> Repo.all()

    targets =
      Repo.Message.targets([messageId])
      |> Enum.map(fn {_, %Data.Message{id: id}} -> id end)

    message =
      Repo.Message.update(
        messageId,
        link_room_id: nil,
        link_start_message_id: nil,
        link_end_message_id: nil,
        link_type: nil,
        text: nil,
        mentions: [],
        links_to: [],
        deleted_by_user_id: author(:user, sess),
        deleted_by_agent_id: author(:agent, sess),
        deleted_at: DateTime.utc_now()
      )

    links =
      (sources ++ targets)
      |> Enum.map(&Repo.Message.touch(&1))

    :ok = Fog.Comms.Slack.Agent.RoomServer.schedule(cmd: cmd, message: message, sess: sess)

    :ok = Fog.Comms.Slack.Customer.MessageTask.schedule(cmd, message, sess)
    :ok = Fog.Comms.MsTeams.MessageTask.schedule(cmd, message, sess)

    {:ok, message, links}
  end

  defp handle_command(
         %Update{
           messageId: message_id,
           text: text,
           linkRoomId: link_room_id,
           linkStartMessageId: link_start_message_id,
           linkEndMessageId: link_end_message_id,
           linkType: link_type,
           mentions: mentions,
           fileIds: file_ids
         } = cmd,
         sess
       ) do
    message =
      handle_command_with_try_rescue(fn ->
        Repo.Message.update(
          message_id,
          text: text,
          link_room_id: link_room_id,
          link_start_message_id: link_start_message_id,
          link_end_message_id: link_end_message_id,
          link_type: link_type,
          mentions: parse_mentions(mentions, text),
          file_ids: file_ids,
          edited_by_user_id: author(:user, sess),
          edited_by_agent_id: author(:agent, sess),
          edited_at: DateTime.utc_now()
        )
      end)

    targets =
      Repo.Message.targets([message_id])
      |> Enum.map(fn {_, %Data.Message{id: id}} -> Repo.Message.touch(id) end)

    :ok = Fog.Comms.Slack.Agent.RoomServer.schedule(cmd: cmd, message: message, sess: sess)

    :ok = Fog.Comms.Slack.Customer.MessageTask.schedule(cmd, message, sess)
    :ok = Fog.Comms.MsTeams.MessageTask.schedule(cmd, message, sess)

    room = Repo.Room.get(message.room_id)
    :ok = Fog.Ai.EventTask.schedule(cmd: cmd, message: message, room: room, sess: sess)

    {:ok, message, targets}
  end

  defp handle_command(
         %Seen{
           messageId: message_id,
           roomId: room_id
         },
         sess
       ) do
    Repo.Seen.set(
      room_id,
      author(:user, sess),
      author(:agent, sess),
      message_id
    )
  end

  defp handle_command(
         %Unseen{
           roomId: roomId
         },
         sess
       ) do
    Repo.Seen.unset(
      roomId,
      author(:user, sess),
      author(:agent, sess)
    )
  end

  defp handle_command(
         %SetReaction{
           messageId: messageId,
           reaction: reaction
         } = cmd,
         sess
       ) do
    %Data.Message{} = message0 = Repo.Message.get(messageId) |> Repo.preload(:reactions)

    Repo.MessageReaction.set(
      messageId,
      author(:user, sess),
      author(:agent, sess),
      reaction
    )

    :ok = Fog.Comms.Slack.Agent.RoomServer.schedule(cmd: cmd, message: message0, sess: sess)

    :ok = Fog.Comms.Slack.Customer.MessageTask.schedule(cmd, message0, sess)
    :ok = Fog.Comms.MsTeams.MessageTask.schedule(cmd, message0, sess)

    %Data.Message{} = message = Repo.Message.get(messageId)

    {:ok, message}
  end

  defp handle_command(
         %RefreshFiles{
           messageId: messageId
         },
         _sess
       ) do
    %Data.Message{} = message = Repo.Message.get(messageId)
    {:ok, message, []}
  end

  defp handle_create(
         %Create{
           roomId: room_id,
           text: text,
           clientId: client_id,
           fileIds: file_ids,
           linkRoomId: link_room_id,
           linkStartMessageId: link_start_message_id,
           linkEndMessageId: link_end_message_id,
           linkType: link_type,
           mentions: mentions,
           fromNameOverride: from_name_override,
           fromAvatarUrlOverride: from_image_url_override,
           source: source
         } = cmd,
         sess
       ) do
    message_res =
      handle_command_with_try_rescue(fn ->
        Repo.Message.create(
          room_id,
          text,
          client_id,
          file_ids,
          link_room_id,
          link_start_message_id,
          link_end_message_id,
          link_type,
          parse_mentions(mentions, text),
          author(:user, sess),
          author(:agent, sess),
          from_name_override,
          from_image_url_override,
          source
        )
      end)

    with {:ok, message, _} <- message_res do
      message = message |> Repo.preload([:helpdesk, :sources])
      room = Repo.Room.get(room_id) |> Repo.preload(tags: :tag)

      # NOTE: when this command (Api.Message.Create) is a part of a not-yet-committed transaction, getting stuff that was just created (e.g. room), but not committed, will not work inside another process, so we have to pass preloaded objects. Ideally, this whole thing should happen post-commit in a separate pipeline

      :ok = Fog.Comms.Slack.Agent.RoomServer.schedule(cmd: cmd, message: message, sess: sess)

      :ok = Fog.Comms.Slack.Customer.MessageTask.schedule(cmd, message, room, sess)
      :ok = Fog.Comms.MsTeams.MessageTask.schedule(cmd, message, room, sess)
      :ok = Fog.Merge.EventTask.schedule(cmd: cmd, message: message, room: room, sess: sess)
      :ok = Fog.Ai.EventTask.schedule(cmd: cmd, message: message, room: room, sess: sess)

      workspace =
        Fog.Repo.Workspace.get(message.helpdesk.workspace_id) |> Repo.preload(:feature_flags)

      workspace_feature_flags = Enum.map(workspace.feature_flags, & &1.feature_flag_id)

      is_issue = room.tags |> Enum.find_value(fn rt -> rt.tag.name in [":issue"] end)

      if is_issue === true and room.type !== "dialog" and
           "User Tag Scoping" not in workspace_feature_flags do
        open_tag = Repo.Tag.create(message.helpdesk.workspace_id, ":status:open")
        closed_tag = Repo.Tag.create(message.helpdesk.workspace_id, ":status:closed")

        Repo.Room.update_tags(
          room_id,
          [open_tag.id],
          [closed_tag.id],
          Session.agent_id(sess),
          Session.user_id(sess)
        )
      end
    end

    message_res
  end

  def handle_command_with_try_rescue(cmd_fun) do
    try do
      cmd_fun.()
    rescue
      e in Ecto.InvalidChangesetError ->
        case e do
          %Ecto.InvalidChangesetError{
            changeset: %Ecto.Changeset{errors: [text: {"empty_text_without_files", []}]}
          } ->
            throw({:reply, Err.invalid_request(error: "text is required")})

          _ ->
            reraise e, __STACKTRACE__
        end

      e ->
        reraise e, __STACKTRACE__
    end
  end

  def author(:user, %Session.User{userId: user_id}), do: user_id
  def author(:agent, %Session.Agent{agentId: agent_id}), do: agent_id
  def author(_, _), do: nil

  defp parse_mentions(mentions, text) when is_list(mentions) do
    mentions
    |> Enum.sort_by(& &1.text, :desc)
    |> Enum.flat_map_reduce(
      text,
      fn
        %Mention{} = m, t when is_binary(m.text) ->
          case String.replace(t, "@" <> m.text, "#") do
            ^t -> {[], t}
            t1 -> {[parse_mention(m)], t1}
          end

        _, t ->
          {[], t}
      end
    )
    |> elem(0)
  end

  defp parse_mentions(nil, _), do: []

  defp parse_mention(%Mention{id: "u" <> _ = user_id, text: text}),
    do: %{user_id: user_id, text: text}

  defp parse_mention(%Mention{id: "a" <> _ = agent_id, text: text}),
    do: %{agent_id: agent_id, text: text}
end
