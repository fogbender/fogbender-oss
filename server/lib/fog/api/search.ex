defmodule Fog.Api.Search do
  @moduledoc """
  Search commands

  - `Search.Room`
  - `Search.Roster`
  - `Search.RoomMessages`
  - `Search.AllMessages`
  - `Search.AuthorEmail`
  """
  use Fog.Api.Handler
  alias Fog.{Repo, Utils}
  alias Fog.Api.{Perm, Event, Session}

  require Repo.Room
  require Logger

  defmsg(Room, [:roomId])

  defmsg(Roster, [
    :workspaceId,
    :helpdeskId,
    :mentionRoomId,
    :type,
    :tagIds,
    :tagNames,
    :term,
    :termFields,
    :limit,

    # deprecated
    :tag_ids,
    :tag_names
  ])

  defmsg(Members, [:roomId])
  defmsg(Issues, [:workspaceId, :term])
  defmsg(AuthorEmail, [:type, :authorId])
  defmsg(RoomMessages, [:roomId, :term, :limit])
  defmsg(Customers, [:workspaceId, :customerIds, :term, :limit])

  @commands [Room, Roster, Members, Issues, AuthorEmail, RoomMessages, Customers]

  defmsg(Ok, [:items])
  deferr(Err)

  def info(%command{} = m, s) when command in @commands do
    m = deprecate(m)

    if auth(m, s) do
      results = handle_command(m, s)
      {:reply, %Ok{items: results}}
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _), do: :skip

  defp auth(%Issues{workspaceId: wid}, sess),
    do: Perm.Workspace.allowed?(sess, :read, workspace_id: wid)

  defp auth(%Room{roomId: room_id}, sess),
    do: Perm.Room.allowed?(sess, :read, room_id: room_id)

  defp auth(%Members{roomId: rid}, sess), do: Perm.Room.allowed?(sess, :read, room_id: rid)

  defp auth(%Roster{workspaceId: wid}, sess) when is_binary(wid),
    do: Perm.Workspace.allowed?(sess, :read, workspace_id: wid)

  defp auth(%Roster{helpdeskId: hid}, sess),
    do: Perm.Helpdesk.allowed?(sess, :read, helpdesk_id: hid)

  defp auth(%AuthorEmail{}, sess),
    do: Perm.Vendor.allowed?(sess, :read, vendor_id: sess.vendorId)

  defp auth(%RoomMessages{roomId: id}, sess) do
    Perm.Room.allowed?(sess, :read, room_id: id)
  end

  defp auth(%Customers{workspaceId: wid}, sess) do
    Perm.Workspace.allowed?(sess, :read, workspace_id: wid)
  end

  defp handle_command(%Room{roomId: roomId}, _sess) do
    rooms_from_data([Repo.Room.get(roomId)])
  end

  defp handle_command(%Roster{} = cmd, %Session.User{userId: uid}) do
    Repo.SearchRoom.for_user(uid,
      helpdesk_id: cmd.helpdeskId,
      mention_room_id: cmd.mentionRoomId,
      type: cmd.type,
      tag_ids: cmd.tagIds,
      tag_names: cmd.tagNames,
      term: cmd.term,
      term_fields: cmd.termFields,
      limit: cmd.limit
    )
    |> rooms_from_data()
  end

  defp handle_command(%Roster{} = cmd, %Session.Agent{agentId: aid}) do
    integrations = Repo.Integration.all(cmd.workspaceId)

    Repo.SearchRoom.for_agent(aid,
      workspace_id: cmd.workspaceId,
      mention_room_id: cmd.mentionRoomId,
      term: cmd.term,
      type: cmd.type,
      tag_ids: cmd.tagIds,
      tag_names: cmd.tagNames,
      term_fields: cmd.termFields,
      limit: cmd.limit
    )
    |> rooms_from_data_with_commands(integrations)
  end

  defp handle_command(%Members{roomId: room_id}, sess) do
    room = Repo.Room.get(room_id) |> Repo.preload(:helpdesk)

    integrations = Repo.Integration.all(room.helpdesk.workspace_id)

    case sess do
      %Session.User{userId: uid} ->
        Repo.SearchRoom.for_user(
          uid,
          helpdesk_id: room.helpdesk_id,
          mention_room_id: room_id,
          with_monolog: true
        )

      %Session.Agent{agentId: aid} ->
        Repo.SearchRoom.for_agent(
          aid,
          workspace_id: room.helpdesk.workspace_id,
          mention_room_id: room_id,
          with_monolog: true
        )
    end
    |> rooms_from_data_with_commands(integrations)
  end

  defp handle_command(%Issues{workspaceId: wid, term: term}, sess) do
    Fog.Issue.search(sess, %{workspace_id: wid, term: term})
    |> Enum.map(&Event.Issue.from_data/1)
  end

  defp handle_command(%AuthorEmail{authorId: authorId, type: type}, sess) do
    author =
      case type do
        "user" -> Repo.User.from_vendor(sess.vendorId, authorId)
        "agent" -> Repo.Agent.from_vendor(sess.vendorId, authorId)
      end

    [%{email: author.email}]
  end

  defp handle_command(%RoomMessages{roomId: room_id, term: term} = m, _sess) do
    Repo.Search.room_messages(%{room_id: room_id, term: term, limit: Map.get(m, :limit)})
    |> Event.Message.preload()
    |> Enum.map(&Event.Message.from_data/1)
  end

  defp handle_command(%Customers{workspaceId: wid, customerIds: ids, term: term, limit: limit}, _) do
    limit = limit || 10
    ids = ids || []
    term = term || ""

    Repo.Helpdesk.search(wid, ids, term, limit)
    |> Event.Customer.from_data()
  end

  defp rooms_from_data(rooms) do
    rooms
    |> Event.Room.preload()
    |> Enum.map(&Event.Room.from_data/1)
  end

  defp rooms_from_data_with_commands(rooms, integrations) do
    rooms
    |> Event.Room.preload()
    |> Enum.map(&Fog.Integration.with_commands(&1, integrations))
    |> Enum.map(&Event.Room.from_data/1)
  end

  # TODO remove deprecated fields
  defp deprecate(
         %Roster{tag_ids: tag_ids, tag_names: tag_names, tagIds: tagIds, tagNames: tagNames} = m
       ) do
    unless is_nil(tag_ids),
      do: Logger.warning("Search.Roster tag_ids is deprecated -- use tagIds")

    unless is_nil(tag_names),
      do: Logger.warning("Search.Roster tag_names is deprecated -- use tagNames")

    %Roster{
      m
      | tagIds: Utils.coalesce([tagIds, tag_ids]),
        tagNames: Utils.coalesce([tagNames, tag_names])
    }
  end

  defp deprecate(m), do: m
end
