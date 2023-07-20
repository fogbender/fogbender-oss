defmodule Fog.Api.Roster.View do
  alias Fog.Api.{Event, Roster}
  alias Fog.GroupedList
  alias __MODULE__

  use Fog.StructAccess

  defstruct [
    :grouped_list,
    :sections,
    :filter,
    :section,
    :counter
  ]

  @type t() :: %__MODULE__{}
  @type grouped_item() :: GroupedList.grouped_item()

  def new(cfg, session) do
    with {:ok, filter} <- Roster.Filter.new(cfg[:filters], session),
         {:ok, section} <- Roster.Section.new(cfg[:sections], session),
         {:ok, counter} <- Roster.Counter.new(cfg[:counters], session) do
      view = %View{
        grouped_list: GroupedList.new(),
        filter: filter,
        section: section,
        counter: counter
      }

      {:ok, view}
    else
      {:error, error} -> {:error, error}
    end
  end

  @spec load(%View{}, [Event.RosterRoom.t()], Roster.session()) :: %View{}
  def load(view, events, session) do
    Enum.reduce(events, view, fn e, v ->
      update(v, e, session)
    end)
  end

  @spec update(t(), Event.RosterRoom.t(), Roster.session()) :: t()
  def update(%View{} = view, %Event.RosterRoom{} = event, session) do
    case Roster.Section.from_event(event, view.section, view.filter, session) do
      [] ->
        remove(view, event.roomId)

      sections ->
        counters = Roster.Counter.from_event(event, view.counter, session)

        view
        |> update_sections(sections)
        |> update_counters(event.roomId, sections, counters)
    end
  end

  @spec remove(t(), Roster.id()) :: t()
  def remove(%View{} = view, room_id) do
    update_in(view, [:grouped_list], &GroupedList.remove(&1, room_id))
  end

  @spec flush_updated(t(), integer()) :: {[grouped_item()], t()}
  def flush_updated(%View{} = view, limit \\ 0) do
    {updated, grouped_list} = GroupedList.flush_updated(view.grouped_list)
    updated = Enum.filter(updated, &limit_filter(&1, limit))
    {updated, %View{view | grouped_list: grouped_list}}
  end

  @spec get_range(t(), Roster.section(), Roster.id(), integer()) :: [grouped_item()]
  def get_range(%View{} = v, section, start_id, limit) do
    GroupedList.get_group_items_range(v.grouped_list, section, start_id, limit)
  end

  @spec get_item(t(), Roster.id()) :: [grouped_item()]
  def get_item(%View{} = v, room_id) do
    GroupedList.get_item(v.grouped_list, room_id)
  end

  defp update_sections(view, sections) do
    for %{id: id} = s <- sections, reduce: view do
      view -> update_in(view, [:grouped_list], &GroupedList.insert_group(&1, id, s))
    end
  end

  defp update_counters(view, room_id, sections, counters) do
    room_counters = Enum.map(sections, &{&1.id, counters}) |> Enum.into(%{})
    update_in(view, [:grouped_list], &GroupedList.insert_item(&1, room_id, room_counters))
  end

  defp limit_filter(_, 0), do: true
  defp limit_filter({:group, _, _, _}, _), do: true
  defp limit_filter({:item, _, sections}, _) when sections == %{}, do: false
  defp limit_filter({:item, _, sections}, limit), do: min_section_pos(sections) < limit

  defp min_section_pos(sections), do: Map.values(sections) |> Enum.min()
end
