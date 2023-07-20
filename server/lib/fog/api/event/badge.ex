defmodule Fog.Api.Event.Badge do
  alias Fog.{Data, PubSub, Repo, Utils}
  alias Fog.Api.Event
  alias Fog.Api.Event.Badge

  use Fog.StructAccess

  defstruct [
    :msgType,
    :msgId,
    :vendorId,
    :workspaceId,
    :customerId,
    :roomId,
    :roomType,
    :count,
    :firstUnreadMessage,
    :lastRoomMessage,
    :updatedTs,
    :mentionsCount,
    :nextMentionMessage
  ]

  @type t() :: %__MODULE__{}

  def load_updated(ctx, opts, _sess), do: load(ctx, opts) |> Map.get(:items)
  def load_inserted(ctx, opts, _sess), do: load(ctx, opts)

  def load(ctx, opts) do
    page = Repo.Badge.load_stream(ctx, opts)

    items =
      page.items
      |> preload()
      |> Enum.map(&from_data/1)

    %{page | items: items}
  end

  # load badge for this room and agent/user
  def load_all(%Data.Seen{room_id: room_id, agent_id: agent_id, user_id: user_id}) do
    load_all(room_id: room_id, agent_id: agent_id, user_id: user_id)
  end

  def load_all(%Event.Message{roomId: room_id}), do: load_all(room_id: room_id)

  def load_all(%Event.Room{id: room_id}), do: load_all(room_id: room_id)

  def load_all(ctx) do
    Repo.Badge.load_all(ctx)
    |> preload()
  end

  def load_all_events(ctx) do
    Repo.Badge.load_all(ctx)
    |> preload()
    |> Enum.map(&from_data(&1, ctx))
  end

  defp preload(badge) do
    message_info = [
      [mentions: [:user, :agent]],
      :helpdesk,
      :workspace,
      :from_user,
      :from_agent,
      :deleted_by_agent,
      :deleted_by_user
    ]

    badge
    |> Repo.preload(
      room: [:vendor, :workspace, :customer],
      first_unread_message: message_info,
      last_room_message: message_info,
      next_mention_message: message_info
    )
  end

  def publish(%Data.Badge{} = b) do
    e = from_data(b)
    for t <- topics(b), do: PubSub.publish(t, e)
    :ok
  end

  defp topics(%Data.Badge{agent_id: agent_id}) when agent_id != nil do
    [
      "agent/#{agent_id}/badges"
    ]
  end

  defp topics(%Data.Badge{user_id: user_id}) when user_id != nil do
    [
      "user/#{user_id}/badges"
    ]
  end

  defp from_data(%Data.Badge{} = b, opts \\ []) do
    first_unread_message = to_message(b.first_unread_message, opts)
    last_room_message = to_message(b.last_room_message, opts)
    next_mention_message = to_message(b.next_mention_message, opts)

    %Badge{
      vendorId: b.room.vendor.id,
      workspaceId: b.room.workspace.id,
      customerId: b.room.customer.id,
      roomId: b.room_id,
      roomType: b.room.type,
      count: b.count,
      firstUnreadMessage: first_unread_message,
      lastRoomMessage: last_room_message,
      updatedTs: b.updated_at |> Utils.to_unix(),
      mentionsCount: b.mentions_count,
      nextMentionMessage: next_mention_message
    }
  end

  defp to_message(nil, _), do: nil
  defp to_message(%Data.Message{} = m, opts), do: Event.Message.from_data(m, opts)
end
