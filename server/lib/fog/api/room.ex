defmodule Fog.Api.Room do
  @moduledoc """
  Room create/update commands.

  - `Room.Create`
  - `Room.Update`      - rename room / change membership
  - `Room.Archive`      - room will not be shown in search results
  """
  use Fog.Api.Handler
  alias Fog.{Api, Ai}
  alias Fog.Api.{Event, Session, Perm}
  alias Fog.{Repo, Utils}

  require Logger

  defmsg(Create, [
    :helpdeskId,
    :name,
    :type,
    :members,
    :tags,
    :meta,
    # Create room with forward
    :linkRoomId,
    :linkStartMessageId,
    :linkEndMessageId
  ])

  defmsg(Update, [
    :roomId,
    :name,
    :membersToAdd,
    :membersToRemove,
    :tagsToAdd,
    :tagsToRemove
  ])

  defmsg(Summarize, [
    :roomId,
    :startMessageId,
    :endMessageId,
    :maxWords
  ])

  defmsg(Archive, [:roomId])
  defmsg(Unarchive, [:roomId])
  defmsg(Resolve, [:roomId, :tilTs])
  defmsg(Unresolve, [:roomId])
  @commands [Create, Archive, Unarchive, Update, Resolve, Unresolve]

  defmsg(Ok, [:roomId])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    m = normalize_tags(m)

    if auth(m, s) do
      room = handle_command(m, s)
      :ok = Event.publish(room)
      {:reply, %Ok{roomId: room.id}}
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp auth(%Create{helpdeskId: hid, linkRoomId: link_room_id, tags: tags}, sess) do
    Perm.Room.allowed?(sess, :create, helpdesk_id: hid, link_room_id: link_room_id, tags: tags)
  end

  defp auth(%Update{roomId: room_id, tagsToAdd: t1, tagsToRemove: t2}, sess) do
    Perm.Room.allowed?(sess, :update, room_id: room_id, tags: t1 ++ t2)
  end

  defp auth(%Archive{roomId: room_id}, sess) do
    Perm.Room.allowed?(sess, :update, room_id: room_id, tags: [])
  end

  defp auth(%Unarchive{roomId: room_id}, sess) do
    Perm.Room.allowed?(sess, :update, room_id: room_id, tags: [])
  end

  defp auth(%Resolve{roomId: room_id}, sess),
    do: Perm.Room.allowed?(sess, :update, room_id: room_id, tags: [])

  defp auth(%Unresolve{roomId: room_id}, sess),
    do: Perm.Room.allowed?(sess, :update, room_id: room_id, tags: [])

  defp auth(%Summarize{roomId: room_id}, sess),
    do: Perm.Room.allowed?(sess, :read, room_id: room_id)

  defp handle_command(%Create{helpdeskId: hid, linkRoomId: link_room_id} = c, sess)
       when not is_nil(link_room_id) do
    source = Repo.Room.get(link_room_id) |> Repo.preload(:members)

    members = Enum.map(source.members, &(&1.agent_id || &1.user_id))
    members = prepare_members(members, sess)

    wid = workspace_id_from_helpdesk_id(hid)
    {_tags, tag_ids} = prepare_tags(wid, c.tags)

    {:ok, {room, message_id}} =
      Repo.transaction(fn ->
        room = create(wid, hid, source.type, c.name, members, tag_ids, sess)

        message_create_command = %Api.Message.Create{
          roomId: room.id,
          text: "Forwarded from #{source.name}",
          linkRoomId: link_room_id,
          linkStartMessageId: c.linkStartMessageId,
          linkEndMessageId: c.linkEndMessageId,
          linkType: "forward"
        }

        {:reply, %Api.Message.Ok{messageId: message_id}} =
          Api.Message.info(message_create_command, sess)

        {room, message_id}
      end)

    :ok = Fog.Merge.EventTask.schedule(cmd: c, room: room, message_id: message_id, sess: sess)

    room
  end

  defp handle_command(
         %Create{helpdeskId: hid, type: type, name: name, tags: tags, members: members},
         sess
       ) do
    wid = workspace_id_from_helpdesk_id(hid)
    {_, tags} = prepare_tags(wid, tags)
    members = prepare_members(members, sess)
    create(wid, hid, type, name, members, tags, sess)
  end

  defp handle_command(
         %Update{
           roomId: room_id,
           membersToAdd: members_to_add,
           membersToRemove: members_to_remove
         },
         _
       )
       when is_list(members_to_add) and is_list(members_to_remove) do
    Repo.Room.update_members(room_id, members_to_add, members_to_remove)
  end

  defp handle_command(
         %Update{
           roomId: room_id,
           tagsToAdd: tags_to_add,
           tagsToRemove: tags_to_remove
         },
         sess
       )
       when tags_to_add != [] or tags_to_remove != [] do
    wid = workspace_id_from_room_id(room_id)
    {_, tags_to_add} = prepare_tags(wid, tags_to_add)
    {_, tags_to_remove} = prepare_tags(wid, tags_to_remove)

    Repo.Room.update_tags(
      room_id,
      tags_to_add,
      tags_to_remove,
      Session.agent_id(sess),
      Session.user_id(sess)
    )
  end

  defp handle_command(
         %Update{
           roomId: room_id,
           name: room_name
         },
         _
       )
       when is_binary(room_name) do
    Repo.Room.update_name(room_id, room_name)
  end

  defp handle_command(%Archive{roomId: room_id} = c, sess) do
    res =
      Repo.Room.update(
        room_id,
        status: "archived"
      )

    :ok = Fog.Merge.EventTask.schedule(cmd: c, sess: sess)

    res
  end

  defp handle_command(%Unarchive{roomId: room_id} = c, sess) do
    res =
      Repo.Room.update(
        room_id,
        status: "active"
      )

    :ok = Fog.Merge.EventTask.schedule(cmd: c, sess: sess)

    res
  end

  defp handle_command(%Resolve{roomId: room_id, tilTs: til_ts}, sess) do
    Repo.Room.resolve(
      room_id,
      true,
      Session.actor_id(sess),
      til_ts && Utils.from_unix(til_ts)
    )
  end

  defp handle_command(%Unresolve{roomId: room_id}, sess) do
    Repo.Room.resolve(
      room_id,
      false,
      Session.actor_id(sess),
      nil
    )
  end

  defp handle_command(
         %Summarize{
           roomId: room_id,
           startMessageId: start_message_id,
           endMessageId: end_message_id
         } = cmd,
         _sess
       ) do
    maxWords = cmd["maxWords"] || 8

    prompt =
      Repo.Room.messages_slice(room_id, start_message_id, end_message_id)
      |> Enum.map(fn m ->
        author = Utils.get_author(m)
        "#{author.name}: #{m.text}"
      end)
      |> Enum.join("\n\n")

    prompt = """
      Come up with a title for the following text. The title should be at most #{maxWords || 8} words long.

      Text: \"\"\"
      #{prompt}
      \"\"\"
    """

    case Ai.ask_ai(prompt) do
      {:response, response} ->
        {:ok, response}

      e ->
        Logger.error("Error: #{inspect(e)} #{Exception.format_stacktrace()}")
        {:error, "Could not summarize"}
    end
  end

  defp create(_wid, hid, "dialog", _, members, tags, sess)
       when is_list(members) and length(members) == 2 do
    params =
      [
        helpdesk_id: hid,
        tags: tags
      ] ++
        case sess do
          %Session.Agent{} -> [created_by_agent_id: sess.agentId]
          %Session.User{} -> [created_by_user_id: sess.userId]
        end

    Repo.Room.create_dialog(members, params)
  end

  defp create(wid, hid, "private", name, members, tags, sess) do
    tags =
      case sess do
        %Session.Agent{agentId: agent_id} ->
          tag_name = ":assignee:#{agent_id}"
          tag = Repo.Tag.create(wid, tag_name)
          [tag.id | tags]

        _ ->
          tags
      end

    params =
      [
        helpdesk_id: hid,
        name: name,
        tags: tags
      ] ++
        case sess do
          %Session.Agent{} -> [created_by_agent_id: sess.agentId]
          %Session.User{} -> [created_by_user_id: sess.userId]
        end

    Repo.Room.create_private(wid, members, params)
  end

  defp create(wid, hid, "public", name, _, tags, sess) do
    params =
      [
        helpdesk_id: hid,
        name: name,
        type: "public",
        tags: tags
      ] ++
        case sess do
          %Session.Agent{} -> [created_by_agent_id: sess.agentId]
          %Session.User{} -> [created_by_user_id: sess.userId]
        end

    Repo.Room.create(wid, params)
  end

  defp normalize_tags(%Create{helpdeskId: hid} = command) do
    wid = workspace_id_from_helpdesk_id(hid)

    tags =
      (Map.get(command, :tags) || []) ++
        (Map.get(command, :meta) || [])

    %{command | tags: tag_ids_to_names(wid, tags)}
  end

  defp normalize_tags(
         %Update{roomId: rid, tagsToAdd: tags_to_add, tagsToRemove: tags_to_remove} = command
       ) do
    wid = workspace_id_from_room_id(rid)

    %{
      command
      | tagsToAdd: tag_ids_to_names(wid, tags_to_add),
        tagsToRemove: tag_ids_to_names(wid, tags_to_remove)
    }
  end

  defp normalize_tags(command), do: command

  defp tag_ids_to_names(_, []), do: []
  defp tag_ids_to_names(_, nil), do: []

  defp tag_ids_to_names(wid, tags) do
    tags = Enum.uniq(tags)
    ids = Enum.filter(tags, &(String.first(&1) === "t"))
    names = Repo.Workspace.get_tags(wid, ids) |> Enum.map(& &1.name)
    names ++ (tags -- ids)
  end

  defp prepare_tags(_, []), do: {[], []}

  defp prepare_tags(wid, tags) do
    tags =
      Enum.map(tags, fn t ->
        Repo.Tag.create(wid, t)
      end)

    {tags, tags |> Enum.map(& &1.id)}
  end

  defp prepare_members(members, sess) do
    [Session.actor_id(sess) | members || []]
    |> Enum.uniq()
  end

  defp workspace_id_from_helpdesk_id(hid) do
    helpdesk = Fog.Repo.Helpdesk.get(hid)
    helpdesk.workspace_id
  end

  defp workspace_id_from_room_id(rid) do
    room = Fog.Repo.Room.get(rid) |> Repo.preload(:workspace)
    room.workspace.id
  end
end
