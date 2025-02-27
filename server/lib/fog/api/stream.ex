defmodule Fog.Api.Stream do
  @moduledoc """
  Provides two commands for subscribing to events streams and load historical data.
  Stream topic has structure "context/context_id/events".

  Contexts are `helpdesk|workspace|helpdesk|room|agent|user`.
  Events are `rooms|messages`.

  ### Example

  "helpdesk/h123423/rooms" - rooms from helpdesk h123423.
  "vendor/v12345/rooms" - rooms from all helpdesks from vendor v12345.

  ### Example

  Stream.Sub{topic: "helpdesk/h1234234/rooms} - will subscribe for all Room events from helpdesk context.
  When `since: timestamp` present, will return all updates since timestamp. If the list is too long,
  will return return tooManyUpdates: true.

  Stream.Get{topic: "room/r1234234/messages} - will load messages from room context.

  Stream.Get will accept `before|around|since` param with optional limit to load data from
  particular moment in time. Timestamps are unix milliseconds integers.

  ### Example

  Stream.Sub{topic: "room/r1234234/messages", since: 1587674372176} - subscribes to new messages from room context and
  loads messages since 1587674372176 timestamp.

  Stream.Get{topic: "vendor/v123423/rooms", around: 1587674372176, limit: 10} - will load rooms from vendor inserted/changed before
  or after 1587674372176 timestamp, limiting both directions to 10 items.

  To unsubscribe, use Stream.UnSub{topic: "vendor/v123423/rooms"}).
  """
  use Fog.Api.Handler

  alias Fog.{Repo, Data, PubSub}
  alias Fog.Api.{Perm, Event}

  @sub_limit 10

  defmsg(Sub, [:topic, :before, :around, :since, :aroundId])
  defmsg(SubOk, [:topic, :items, :tooManyUpdates])

  defmsg(UnSub, [:topic])
  defmsg(UnSubOk, [:topic])

  defmsg(Get, [
    :topic,
    :limit,
    :before,
    :around,
    :since,
    :aroundId,
    :startId,
    :endId,
    :next,
    :prev
  ])

  defmsg(GetOk, [:topic, :items, :next, :prev])

  deferr(Err, [:topic])

  @commands [
    Sub,
    UnSub,
    Get
  ]

  def info(c, s), do: info(c, s, [])

  def info(%command{topic: topic} = m, sess, _) when command in @commands do
    [name, id, resource] = parse_topic(topic)

    if auth(command, name, id, sess) do
      true = valid_resource(resource)
      ctx = get_ctx(name, id)
      handle_command(ctx, resource, m, sess)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  def event_module(resource) do
    case resource do
      "rooms" -> Event.Room
      "messages" -> Event.Message
      "typing" -> Event.Typing
      "seen" -> Event.Seen
      "badges" -> Event.Badge
      "agents" -> Event.Agent
      "users" -> Event.User
      "customers" -> Event.Customer
      "tags" -> Event.Tag
      "notifications" -> Event.Notification.Message
      "groups" -> Event.AgentGroup
      "control" -> Event.Control
      "stream-reply" -> Event.StreamReply
    end
  end

  def load_inserted(ctx, resource, opts, sess) do
    event_module(resource).load_inserted(ctx, opts, sess)
  end

  def load_updated(ctx, resource, opts, sess) do
    event_module(resource).load_updated(ctx, opts, sess)
  end

  defp handle_command(ctx, resource, %Sub{topic: topic, since: since} = sub_opts, sess) do
    :ok = PubSub.join(topic)

    opts =
      Map.from_struct(sub_opts)
      |> Map.put(:limit, @sub_limit)

    {items, too_many_updates} =
      case since do
        nil ->
          {[], false}

        ts when is_integer(ts) ->
          case load_updated(ctx, resource, opts, sess) do
            items when length(items) == @sub_limit ->
              {[], true}

            items ->
              {items, false}
          end
      end

    {:reply, %SubOk{topic: topic, items: items, tooManyUpdates: too_many_updates}}
  end

  defp handle_command(_ctx, _resource, %UnSub{topic: topic}, _sess) do
    PubSub.leave(topic)
    {:reply, %UnSubOk{topic: topic}}
  end

  defp handle_command(_ctx, _resource, %Get{limit: limit}, _)
       when not is_nil(limit) and (limit < 1 or limit > 1000) do
    {:reply, Err.invalid_request("limit is not valid")}
  end

  defp handle_command(ctx, resource, %Get{topic: topic} = opts, sess) do
    opts = Map.from_struct(opts)

    case load_inserted(ctx, resource, opts, sess) do
      %{items: items, next: next, prev: prev} ->
        {:reply, %GetOk{topic: topic, items: items, next: next, prev: prev}}

      items ->
        {:reply, %GetOk{topic: topic, items: items}}
    end
  end

  defp parse_topic(s), do: String.split(s, "/")

  defp auth(UnSub, _, _, _), do: true
  defp auth(_, ctx, ctx_id, sess), do: Perm.Stream.allowed?(sess, :sub, ctx: ctx, ctx_id: ctx_id)

  defp valid_resource(resource) do
    resource in [
      "rooms",
      "messages",
      "typing",
      "seen",
      "notifications",
      "badges",
      "agents",
      "customers",
      "tags",
      "users",
      "groups",
      "control",
      "stream-reply"
    ]
  end

  defp get_ctx(name, id) do
    case name do
      "vendor" -> Data.Vendor
      "workspace" -> Data.Workspace
      "helpdesk" -> Data.Helpdesk
      "room" -> Data.Room
      "agent" -> Data.Agent
      "user" -> Data.User
    end
    |> Repo.get(id)
  end
end
