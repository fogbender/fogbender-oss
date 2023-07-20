defmodule Fog.Api.Roster.Cache do
  @moduledoc """
  Structure for keeping Roster in server state.
  """

  alias Fog.{Data}
  alias Fog.Api.{Event, Session, Roster}
  alias __MODULE__

  use Fog.StructAccess

  defstruct [
    :rooms,
    :views,
    :context_id
  ]

  @type t() :: %Roster.Cache{
          rooms: %{room_id() => %Event.RosterRoom{}},
          views: %{view_name() => Roster.View.t()},
          context_id: id()
        }

  @type id() :: String.t()
  @type room_id() :: id()
  @type view_name() :: String.t()
  @type ctx() :: %Data.Helpdesk{} | %Data.Workspace{}
  @type session() :: %Session.Agent{} | %Session.User{}
  @type roster_event() :: %Event.RosterRoom{} | %Event.RosterSection{}
  @type room_event() :: %Event.Room{} | %Event.Badge{}
  @type section() :: String.t()

  @spec init(ctx(), session(), integer()) :: {:ok, [roster_event()], t()} | {:error, String.t()}
  def init(ctx, session, limit) do
    new()
    |> Map.put(:context_id, ctx.id)
    |> load(ctx, session)
    |> open_view("main", session, limit)
  end

  defp new() do
    %Roster.Cache{
      rooms: %{},
      views: %{}
    }
  end

  @spec open_view(t(), view_name(), struct(), session()) ::
          {:ok, [roster_event()], t()} | {:error, atom()}
  def open_view(roster, view_name, cfg \\ %{}, session, limit) do
    case Roster.View.new(cfg, session) do
      {:ok, view} ->
        {events, roster} =
          put_in(roster, [:views, view_name], view)
          |> load_view(view_name, session)
          |> get_updated(view_name, limit)

        {:ok, events, roster}

      {:error, error} ->
        {:error, error}
    end
  end

  @spec close_view(t(), view_name()) :: {:ok, t()} | {:error, atom()}
  def close_view(%Cache{} = roster, view_name) do
    case view(roster, view_name) do
      nil ->
        {:error, :not_found}

      _ ->
        roster = update_in(roster, [:views], &Map.delete(&1, view_name))
        {:ok, roster}
    end
  end

  @spec get_context_id(t()) :: id()
  def get_context_id(%Cache{context_id: cid}), do: cid

  @spec get_range(t(), view_name(), section(), integer(), integer()) ::
          {:ok, [roster_event()], t()} | {:error, :atom}
  def get_range(%Cache{} = roster, view_name, section, start_id, limit) do
    case view(roster, view_name) do
      nil ->
        {:error, :not_found}

      view ->
        events =
          Roster.View.get_range(view, section, start_id, limit)
          |> to_events(roster.rooms, view_name)

        {:ok, events, roster}
    end
  end

  @spec get_rooms(t(), [id()]) :: {:ok, [roster_event()], t()}
  def get_rooms(%Cache{} = roster, room_ids) do
    events =
      for {view_name, view} <- roster.views, room_id <- room_ids do
        Roster.View.get_item(view, room_id)
        |> to_event(roster.rooms, view_name)
      end

    {:ok, events, roster}
  end

  @spec update(t(), room_event(), session()) :: {:ok, [roster_event()], t()} | {:error, atom()}
  def update(%Cache{} = roster, %Event.Room{id: room_id} = room, session) do
    room =
      case get_in(roster, [:rooms, room_id]) do
        nil -> %Event.RosterRoom{room: room, roomId: room_id}
        old -> %Event.RosterRoom{old | room: room}
      end

    update_item(roster, room, session)
  end

  def update(%Cache{} = roster, %Event.Badge{roomId: room_id} = badge, session) do
    case get_in(roster, [:rooms, room_id]) do
      nil ->
        {:ok, [], roster}

      old ->
        room = %Event.RosterRoom{old | badge: badge}
        update_item(roster, room, session)
    end
  end

  defp update_item(%Cache{} = roster, %Event.RosterRoom{roomId: room_id} = room, session) do
    roster = put_in(roster, [:rooms, room_id], room)

    {events, roster} =
      for {view_name, view} <- roster.views, reduce: {[], roster} do
        {events, roster} ->
          view = Roster.View.update(view, room, session)
          roster = put_in(roster, [:views, view_name], view)
          {view_events, roster} = get_updated(roster, view_name)
          {view_events ++ events, roster}
      end

    {:ok, events, roster}
  end

  @spec remove(t(), room_event(), session) :: {:ok, [roster_event()], t()}
  def remove(%Cache{} = roster, %Event.Room{id: room_id} = room, _session) do
    case get_in(roster, [:rooms, room_id]) do
      nil ->
        {:ok, [], roster}

      old ->
        room = %Event.RosterRoom{old | room: room, badge: nil}
        remove_item(roster, room)
    end
  end

  defp remove_item(roster, %Event.RosterRoom{roomId: room_id} = room) do
    roster = put_in(roster, [:rooms, room_id], room)

    {events, roster} =
      for {view_name, view} <- roster.views, reduce: {[], roster} do
        {events, roster} ->
          view = Roster.View.remove(view, room_id)
          roster = put_in(roster, [:views, view_name], view)
          {view_events, roster} = get_updated(roster, view_name)
          {view_events ++ events, roster}
      end

    {_, roster} = pop_in(roster, [:rooms, room_id])

    {:ok, events, roster}
  end

  defp load_view(%Cache{} = roster, view_name, session) do
    view =
      view(roster, view_name)
      |> Roster.View.load(rooms(roster), session)

    put_in(roster, [:views, view_name], view)
  end

  defp rooms(%Cache{rooms: rooms}), do: Map.values(rooms)
  defp view(%Cache{views: views}, view_name), do: Map.get(views, view_name)

  defp get_updated(%Cache{} = roster, view_name, limit \\ 0) do
    view = view(roster, view_name)
    {updated, view} = Roster.View.flush_updated(view, limit)
    events = to_events(updated, roster.rooms, view_name)
    {events, put_in(roster, [:views, view_name], view)}
  end

  defp load(%Cache{} = roster, ctx, session) do
    badges =
      load_badges(session)
      |> Stream.map(&{&1.roomId, &1})
      |> Enum.into(%{})

    rooms =
      Event.Room.load_inserted(ctx, %{limit: 0, without_parsing: true}, session)
      |> Stream.map(fn %Event.Room{id: rid} = room ->
        badge = Map.get(badges, rid)
        {rid, %Event.RosterRoom{roomId: rid, room: room, badge: badge}}
      end)
      |> Enum.into(%{})

    put_in(roster, [:rooms], rooms)
  end

  defp load_badges(%Session.Agent{agentId: aid}),
    do: Event.Badge.load_all_events(agent_id: aid, without_parsing: true)

  defp load_badges(%Session.User{userId: uid}),
    do: Event.Badge.load_all_events(user_id: uid, without_parsing: true)

  defp to_events(grouped_items, rooms, view_name) when is_list(grouped_items) do
    Enum.map(grouped_items, &to_event(&1, rooms, view_name))
  end

  defp to_event({:group, _group, info, counters}, _rooms, view_name) do
    %Event.RosterSection{
      info
      | pos: 0,
        view: view_name,
        count: counters[:count] || 0,
        unreadCount: counters[:unread] || 0,
        mentionsCount: counters[:mentions] || 0,
        unresolvedCount: counters[:unresolved] || 0
    }
  end

  defp to_event({:item, room_id, sections}, rooms, view_name) do
    Map.get(rooms, room_id)
    |> Map.put(:sections, sections)
    |> Map.put(:view, view_name)
  end
end
