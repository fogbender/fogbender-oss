defmodule Fog.SortedList do
  @moduledoc "Sorted list. Indexed from 1."

  def new, do: []

  def put(sl, key, order_term) do
    Enum.sort([{order_term, key} | sl])
  end

  def remove(sl, key) do
    List.keydelete(sl, key, 1)
  end

  def index(sl, key) do
    zero_ix =
      Enum.find_index(sl, fn
        {_, ^key} -> true
        _ -> false
      end)

    case zero_ix do
      nil -> nil
      ix -> ix + 1
    end
  end

  def range(sl, from, limit) when from > 0 and limit > 0 do
    Enum.slice(sl, from - 1, limit)
    |> Enum.map(&elem(&1, 1))
  end
end
