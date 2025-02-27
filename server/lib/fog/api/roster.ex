defmodule Fog.Api.Roster do
  use Fog.Api.Handler
  alias Fog.{Data, Repo, PubSub}
  alias Fog.Api.{Session, Perm, Event, Roster}

  @type view_name() :: String.t()
  @type section() :: String.t()
  @type pos() :: integer()

  defmsg(Sub, [:topic, :limit])
  defmsg(SubOk, [:topic, :items])

  defmsg(UnSub, [:topic])
  defmsg(UnSubOk, [:topic])

  defmsg(OpenView, [
    :topic,
    :view,
    :filters,
    :sections,
    :limit
  ])

  defmsg(OpenViewOk, [:topic, :view, :items])

  defmsg(CloseView, [:topic, :view])
  defmsg(CloseViewOk, [:topic, :view])

  defmsg(GetRange, [:topic, :view, :sectionId, :startPos, :limit])
  defmsg(GetRooms, [:topic, :roomIds])
  defmsg(GetOk, [:topic, :items])

  deferr(Err, [:topic])

  @commands [Sub, UnSub, GetRange, GetRooms, OpenView, CloseView]
  @limit 5

  def info(c, s), do: info(c, s, [])

  def info(%struct{topic: topic} = cmd, sess, _) when struct in @commands do
    with {:ok, [ctx, id]} <-
           parse_topic(topic) || Err.invalid_request(topic: topic, error: "Invalid topic"),
         true <- valid_cmd(cmd) || Err.invalid_request(topic: topic, error: "Invalid command"),
         true <- auth(ctx, id, sess) || Err.forbidden(topic: topic) do
      cmd(cmd, ctx, id, sess)
    else
      reply -> {:reply, reply}
    end
  end

  def info(_event, %{roster: nil}, _), do: :skip

  def info(event, session, _) do
    event
    |> check_context(session)
    |> event(session)
    |> set_events_ids()
    |> process_by_event(event)
  end

  # process_by_event
  defp process_by_event(:skip, _event), do: :skip

  defp process_by_event({:reply, reply, session}, event) do
    case Event.info(event, session) do
      :skip ->
        {:reply, reply, session}

      {:ok, session} ->
        {:reply, reply, session}

      {:reply, event_reply, session} ->
        {:reply, List.flatten([event_reply | reply]), session}
    end
  end

  # event
  defp event(%Event.Room{id: room_id} = room, session) do
    if Perm.Room.allowed?(session, :read, room_id: room_id) do
      update_room(room, session)
    else
      remove_room(room, session)
    end
  end

  defp event(%Event.Badge{} = badge, session) do
    update_room(badge, session)
  end

  defp event(_, _), do: :skip

  # cmd
  defp cmd(%Sub{topic: topic, limit: limit}, ctx, id, session) do
    sub(topic, ctx, id, session, limit)
  end

  defp cmd(%OpenView{}, _ctx, _id, %{roster: nil}) do
    {:reply, Err.invalid_request(error: "Roster is not ready, subscribe to main roster first")}
  end

  defp cmd(_, _ctx, _id, %{roster: nil}), do: :skip

  defp cmd(%UnSub{topic: topic}, ctx, id, session) do
    if Roster.Cache.get_context_id(session.roster) == id do
      unsub(topic, ctx, id, session)
    else
      {:reply, Err.not_found(topic: topic)}
    end
  end

  defp cmd(%GetRange{} = cmd, _ctx, _id, session) do
    {:ok, items, roster} =
      Roster.Cache.get_range(session.roster, cmd.view, cmd.sectionId, cmd.startPos, cmd.limit)

    {:reply, %GetOk{topic: cmd.topic, items: items}, %{session | roster: roster}}
  end

  defp cmd(%GetRooms{} = cmd, _ctx, _id, session) do
    {:ok, items, roster} = Roster.Cache.get_rooms(session.roster, cmd.roomIds)
    {:reply, %GetOk{topic: cmd.topic, items: items}, %{session | roster: roster}}
  end

  defp cmd(%OpenView{} = cmd, _, _, session) do
    limit = cmd.limit || @limit
    filters = cmd.filters || %{}
    sections = cmd.sections || []

    {:ok, items, roster} =
      Roster.Cache.open_view(
        session.roster,
        cmd.view,
        %{filters: filters, sections: sections},
        session,
        limit
      )

    {:reply, %OpenViewOk{topic: cmd.topic, view: cmd.view, items: items},
     %{session | roster: roster}}
  end

  defp cmd(%CloseView{} = cmd, _, _, session) do
    case Roster.Cache.close_view(session.roster, cmd.view) do
      {:ok, roster} ->
        {:reply, %CloseViewOk{topic: cmd.topic, view: cmd.view}, %{session | roster: roster}}

      {:error, :not_found} ->
        {:reply, Err.not_found(topic: cmd.topic)}
    end
  end

  defp set_events_ids({:reply, events, %{eventId: event_id} = session}) when is_list(events) do
    {events, event_id} =
      Enum.map_reduce(
        events,
        event_id,
        fn %event{} = e, event_id when event in [Event.RosterRoom, Event.RosterSection] ->
          {%{e | msgId: event_id + 1}, event_id + 1}
        end
      )

    {:reply, events, %{session | eventId: event_id}}
  end

  defp set_events_ids(other), do: other

  # we need to ignore events from the other workspaces
  defp check_context(event, %{roster: nil}), do: event

  defp check_context(%_{workspaceId: wid} = event, %Session.Agent{roster: roster}) do
    if Roster.Cache.get_context_id(roster) == wid, do: event, else: :skip
  end

  defp check_context(event, _), do: event

  defp auth(ctx, ctx_id, session),
    do: Perm.Stream.allowed?(session, :sub, ctx: ctx, ctx_id: ctx_id)

  defp sub(topic, ctx, ctx_id, session, limit) do
    limit = limit || @limit
    ctx_data = get_ctx(ctx, ctx_id)
    :ok = PubSub.join(rooms_topic(ctx, ctx_id))
    :ok = PubSub.join(badges_topic(session))
    session = Session.load_groups(session)
    {:ok, items, roster} = Roster.Cache.init(ctx_data, session, limit)
    {:reply, %SubOk{topic: topic, items: items}, %{session | roster: roster}}
  end

  defp unsub(topic, ctx, ctx_id, session) do
    :ok = PubSub.leave(rooms_topic(ctx, ctx_id))
    :ok = PubSub.leave(badges_topic(session))
    {:reply, %UnSubOk{topic: topic}, %{session | roster: nil}}
  end

  defp update_room(%event{} = room, session) when event in [Event.Room, Event.Badge] do
    session = Session.load_groups(session)
    {:ok, events, roster} = Roster.Cache.update(session.roster, room, session)
    {:reply, events, %{session | roster: roster}}
  end

  defp remove_room(%Event.Room{} = room, session) do
    room = Event.Room.remove(room)
    {:ok, events, roster} = Roster.Cache.remove(session.roster, room, session)
    {:reply, events, %{session | roster: roster}}
  end

  defp get_ctx("workspace", wid), do: Repo.get(Data.Workspace, wid)
  defp get_ctx("helpdesk", hid), do: Repo.get(Data.Helpdesk, hid)

  defp parse_topic(topic) do
    case String.split(topic, "/") do
      [ctx, id, "roster"] -> {:ok, [ctx, id]}
      _ -> false
    end
  end

  # valid_cmd
  defp valid_cmd(%Sub{} = cmd) do
    is_nil(cmd.limit) or
      (is_integer(cmd.limit) and cmd.limit > 0)
  end

  defp valid_cmd(%GetRange{} = cmd) do
    is_binary(cmd.sectionId) and
      is_binary(cmd.topic) and
      is_binary(cmd.view) and
      is_integer(cmd.startPos) and cmd.startPos > 0 and
      is_integer(cmd.limit) and cmd.limit > 0
  end

  defp valid_cmd(%GetRooms{} = cmd) do
    is_list(cmd.roomIds) and
      Enum.all?(cmd.roomIds, &is_binary(&1))
  end

  defp valid_cmd(%OpenView{} = cmd) do
    is_binary(cmd.view) and cmd.view != "" and
      is_list(cmd.sections) and cmd.sections != [] and
      Roster.Filter.valid?(cmd.filters)
  end

  defp valid_cmd(%CloseView{} = cmd) do
    is_binary(cmd.view) and cmd.view != ""
  end

  defp valid_cmd(_), do: true

  defp rooms_topic("workspace", wid), do: "workspace/#{wid}/rooms"
  defp rooms_topic("helpdesk", hid), do: "helpdesk/#{hid}/rooms"

  defp badges_topic(%Session.Agent{agentId: agent_id}), do: "agent/#{agent_id}/badges"
  defp badges_topic(%Session.User{userId: user_id}), do: "user/#{user_id}/badges"
end
