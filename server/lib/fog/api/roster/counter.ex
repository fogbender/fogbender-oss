defmodule Fog.Api.Roster.Counter do
  alias Fog.Api.{Event, Session}

  @type t() :: (%Event.RosterRoom{} -> %{String.t() => any()})

  @counters [
    "count",
    "unread",
    "mentions",
    "unresolved",
    "order"
  ]

  def default(), do: @counters

  def new(nil, session), do: new(@counters, session)

  def new(counters, _session) do
    {:ok, counters}
  end

  def from_event(event, counters, session) do
    counters
    |> Enum.map(&count(&1, event, session))
    |> Enum.into(%{})
  end

  def count(counter, %Event.RosterRoom{room: room, badge: badge}, session) do
    case counter do
      "order" -> {:order, order(room, badge, session)}
      "count" -> {:count, 1}
      "unread" -> {:unread, unread(badge)}
      "mentions" -> {:mentions, mentions(badge)}
      "unresolved" -> {:unresolved, unresolved(room)}
    end
  end

  defp order(room, badge, %Session.Agent{}), do: order_agent(room, badge)
  defp order(room, badge, %Session.User{}), do: order_user(room, badge)

  defp order_agent(%Event.Room{} = room, %Event.Badge{} = badge) do
    last_message_ts = room[:lastMessage][:createdTs] || room.createdTs
    resolved = room.resolved
    unresolved_at = if resolved, do: false, else: last_message_ts
    has_unread = badge.count > 0 or badge.mentionsCount > 0
    {resolved, unresolved_at, !has_unread, -1 * last_message_ts}
  end

  defp order_agent(%Event.Room{} = room, nil) do
    last_message_ts = room[:lastMessage][:createdTs] || room.createdTs
    resolved = room.resolved
    unresolved_at = if resolved, do: false, else: last_message_ts
    has_unread = false
    {resolved, unresolved_at, !has_unread, -1 * last_message_ts}
  end

  defp order_user(%Event.Room{} = room, %Event.Badge{} = badge) do
    last_message_ts = room[:lastMessage][:createdTs] || room.createdTs
    has_unread = badge.count > 0 or badge.mentionsCount > 0
    is_triage = room.isTriage
    {!is_triage, !has_unread, -1 * last_message_ts}
  end

  defp order_user(%Event.Room{} = room, nil) do
    last_message_ts = room[:lastMessage][:createdTs] || room.createdTs
    has_unread = false
    is_triage = room.isTriage
    {!is_triage, !has_unread, -1 * last_message_ts}
  end

  defp unread(nil), do: 0
  defp unread(%Event.Badge{} = badge), do: badge.count |> int_count()

  defp mentions(nil), do: 0
  defp mentions(%Event.Badge{} = badge), do: badge.mentionsCount |> int_count()

  defp unresolved(%Event.Room{resolved: true}), do: 0
  defp unresolved(%Event.Room{resolved: false}), do: 1

  defp int_count(int) when is_integer(int) do
    if int > 0 do
      1
    else
      0
    end
  end

  defp int_count(_), do: 0
end
