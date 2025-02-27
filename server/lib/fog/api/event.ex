defmodule Fog.Api.Event do
  @moduledoc """
  Handler for incoming events. Processes all events by sending them through transport to client.

  Provides two commands for subscribing to events streams and load historical data.
  Stream topic has structure "context/context_id/events".

  Contexts are `helpdesk|workspace|helpdesk|room `.
  Events are `rooms|messages`.

  ### Example

  "helpdesk/h123423/messages" - messages from all rooms from helpdesk h123423.
  "vendor/v12345/rooms" - rooms from all helpdesks from vendor v12345.

  ### Example

  Event.Sub{topic: "helpdesk/h1234234/rooms} - will subscribe for all Room events from helpdesk context.
  Also will return last 30 messages from the stream.
  Event.Get{topic: "room/r1234234/messages} - will load messages from room context.

  It is also possible to provide `before|around|since` param with optional limit to load data from
  particular moment in time. Timestamps are unix milliseconds integers.

  ### Example

  Event.Sub{topic: "workspace/w1234234/messages", since: 1587674372176} - subscribes to new messages from workspace context and
  loads messages since 1587674372176 timestamp.

  Event.Get{topic: "vendor/v123423/rooms", around: 1587674372176, limit: 10} - will load rooms from vendor created/changed before
  or after 1587674372176 timestamp, limiting both directions to 10 items.
  """
  use Fog.Api.Handler

  alias Fog.Data
  alias Fog.Api.{Event, Perm}

  @events [
    Event.Room,
    Event.Message,
    Event.Typing,
    Event.Seen,
    Event.Notification.Message,
    Event.Badge,
    Event.Agent,
    Event.User,
    Event.Customer,
    Event.Tag,
    Event.Control,
    Event.StreamReply
  ]

  @type msg_id() :: String.t()
  @type msg_type() :: String.t()

  def info(c, s), do: info(c, s, [])

  def info(%Event.Room{id: id} = data, sess, _) do
    data =
      case Perm.Room.allowed?(sess, :read, room_id: id) do
        true ->
          data

        _ ->
          data |> Event.Room.remove()
      end

    {data, sess} = set_event_id(data, sess)
    {:reply, data, sess}
  end

  def info(%event{} = data, sess, _) when event in @events do
    {data, sess} = set_event_id(data, sess)
    {:reply, data, sess}
  end

  def info(_, _, _), do: :skip

  def publish(%Data.Room{} = r), do: Event.Room.publish(r)
  def publish(%Data.Message{} = m), do: Event.Message.publish(m)
  def publish(%Data.Seen{} = s), do: Event.Seen.publish(s)
  def publish(%Data.Badge{} = b), do: Event.Badge.publish(b)
  def publish(%Data.Helpdesk{} = h), do: Event.Customer.publish(h)
  def publish(%Data.User{} = u), do: Event.User.publish(u)

  def publish_all(entities) do
    for e <- entities, do: publish(e)
  end

  def set_event_id(data, %{eventId: eventId} = state) do
    msgId = eventId + 1
    {%{data | msgId: msgId}, %{state | eventId: msgId}}
  end
end
