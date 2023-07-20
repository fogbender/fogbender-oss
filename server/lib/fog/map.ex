defmodule Fog.Map do
  @doc """
      Fog.Map.map(%{a: :b}, & &1)
  is equivalent to
      Enum.map(%{a: :b}, & &1) |> Enum.into(%{})
  or
      Enum.map(%{a: :b}, & &1) |> Map.new()
  but slightly clearer, while being as fast if not faster.
  """
  def map(map, fun) do
    Enum.into(map, %{}, fun)
  end

  @doc """
      Fog.Map.map_value(%{a: 1}, & &1 + 2)
  is equivalent to
      Enum.map(%{a: 1}, fn {k, v} -> {k, v + 2} end) |> Enum.into(%{})
  but slightly clearer, while being as fast if not faster.
  """
  def map_value(map, fun) do
    # TODO: see if :maps.map(fn (k, v) -> fun.(v) end, map) is better
    Enum.into(map, %{}, fn {k, v} -> {k, fun.(v)} end)
  end

  @doc """
  Selects several fields values from map and returns them in a list.

  ## Examples
      iex> Fog.Map.select(%{a: 1, b: 2, c: 3}, [:a, :c])
      [1, 3]

      iex> Fog.Map.select(%{a: 1, b: 2, c: 3}, [:a, :d, :b], "default")
      [1, "default", 2]
  """
  def select(map, fields, default \\ nil) do
    for f <- fields, do: Map.get(map, f, default)
  end
end
