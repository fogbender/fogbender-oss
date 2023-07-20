defmodule Fog.GroupedList do
  @moduledoc """
  GroupedList - list with aggregating functionality.
  Keeps items grouped and ordered inside group by some order term.
  Aggregates item's counters into group's counters.
  """
  alias __MODULE__
  alias Fog.SortedList

  use Fog.StructAccess

  defstruct [
    :items,
    :groups,
    :group_counters,
    :group_items,
    :updated
  ]

  @type t() :: %GroupedList{
          items: %{id() => flat_group_counters()},
          groups: %{group() => group_info()},
          group_counters: group_counters(),
          group_items: %{group() => SortedList.t()},
          updated: MapSet.t()
        }
  @type id() :: any()
  @type group_counters() :: %{group() => counters()}
  @type group() :: String.t()
  @type counters() :: %{counter() => integer()}
  @type counter() :: String.t() | :order
  @type group_pos() :: %{group() => integer()}
  @type grouped_item() :: {:group, group(), counters()} | {:item, id(), group_pos()}
  @type group_info() :: %{}
  @type flat_group_counters() :: [{group(), counter(), any()}]

  def new() do
    %GroupedList{
      items: %{},
      groups: %{},
      group_counters: %{},
      group_items: %{},
      updated: MapSet.new()
    }
  end

  @spec insert_group(t(), group(), any()) :: t()
  def insert_group(%GroupedList{} = state, group, info) do
    case Map.get(state.groups, group) do
      ^info ->
        state

      _ ->
        state
        |> put_in([:groups, group], info)
        |> update_in([:updated], &MapSet.put(&1, {:group, group}))
    end
  end

  @spec insert_item(t(), id(), group_counters()) :: t()
  def insert_item(%GroupedList{} = state, id, counters) do
    flat_counters = flat_item_counters(counters)

    case Map.get(state.items, id) do
      nil ->
        item_insert(state, id, flat_counters)

      old ->
        item_update(state, id, old, flat_counters)
    end
  end

  @spec remove(t(), id()) :: t()
  def remove(%GroupedList{} = state, id) do
    case Map.pop(state.items, id) do
      {nil, items} ->
        %GroupedList{state | items: items}

      {old, items} ->
        %GroupedList{state | items: items}
        |> counters_remove(id, old)
    end
  end

  defp item_insert(%GroupedList{} = state, id, counters) do
    state
    |> items_put(id, counters)
    |> counters_insert(id, counters)
  end

  defp item_update(%GroupedList{} = state, id, old, counters) do
    state
    |> items_put(id, counters)
    |> counters_remove(id, old -- counters)
    |> counters_insert(id, counters -- old)
  end

  defp items_put(%GroupedList{} = state, id, counters) do
    state
    |> put_in([:items, id], counters)
    |> update_in([:updated], &MapSet.put(&1, {:item, id}))
  end

  defp flat_item_counters(item_counters) do
    for {group, counters} <- item_counters, {counter, value} <- counters do
      {group, counter, value}
    end
  end

  defp counters_remove(%GroupedList{} = state, id, counters) do
    for {group, counter, value} <- counters, reduce: state do
      state -> group_remove(state, id, group, counter, value)
    end
  end

  def counters_insert(%GroupedList{} = state, id, counters) do
    for {group, counter, value} <- counters, reduce: state do
      state -> group_insert(state, id, group, counter, value)
    end
  end

  def flush_updated(state), do: {get_updated(state), clean_updated(state)}

  @spec get_updated(t()) :: [grouped_item()]
  def get_updated(%GroupedList{updated: updated} = state) do
    updated
    |> Enum.map(fn
      {:group, group} -> get_group(state, group)
      {:item, id} -> get_item(state, id)
    end)
    |> Enum.reject(&is_nil/1)
  end

  def clean_updated(state), do: Map.put(state, :updated, MapSet.new())

  def get_group(state, group),
    do:
      {:group, group, get_in(state, [:groups, group]),
       get_in(state, [:group_counters, Access.key(group, %{})])}

  def get_group_items_range(state, group, start, limit) do
    get_in(state, [:group_items, Access.key(group, SortedList.new())])
    |> SortedList.range(start, limit)
    |> Enum.map(&get_item(state, &1))
  end

  def get_item(state, id) do
    case Map.get(state.items, id) do
      nil -> {:item, id, %{}}
      counters -> {:item, id, get_item_groups(state, id, counters)}
    end
  end

  defp get_item_groups(state, id, counters) do
    for {group, :order, _} <- counters,
        into: %{} do
      {group, SortedList.index(state.group_items[group], id)}
    end
  end

  defp group_insert(state, id, group, :order, order_term) do
    state
    |> update_in(
      [:group_items, Access.key(group, SortedList.new())],
      &SortedList.put(&1, id, order_term)
    )
    |> update_in([:updated], &MapSet.put(&1, {:item, id}))
  end

  defp group_insert(state, _id, group, counter, value) do
    state
    |> update_in([:group_counters, Access.key(group, %{}), Access.key(counter, 0)], &(&1 + value))
    |> update_in([:updated], &MapSet.put(&1, {:group, group}))
  end

  defp group_remove(state, id, group, :order, _order_term) do
    state
    |> update_in(
      [:group_items, group],
      &SortedList.remove(&1, id)
    )
    |> update_in([:updated], &MapSet.put(&1, {:item, id}))
  end

  defp group_remove(state, _id, group, counter, value) do
    state
    |> update_in([:group_counters, group, counter], &(&1 - value))
    |> update_in([:updated], &MapSet.put(&1, {:group, group}))
  end
end
