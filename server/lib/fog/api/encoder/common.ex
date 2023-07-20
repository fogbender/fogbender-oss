defmodule Fog.Api.Encoder.Common do
  alias Fog.Api.Error
  @api_prefix "Elixir.Fog.Api."

  def to_map(list) when is_list(list) do
    list |> Enum.map(&to_map/1)
  end

  def to_map(%{__struct__: type} = struct) when is_struct(struct) do
    map = Map.from_struct(struct)

    Enum.reduce(map, map, fn
      {:msgType, _}, acc -> %{acc | msgType: type_to_string(type)}
      {field, v}, acc -> %{acc | "#{field}": to_map(v)}
    end)
  end

  def to_map(any), do: any

  def from_map(list) when is_list(list) do
    list |> Enum.map(&from_map/1)
  end

  def from_map(%{"msgType" => msgType} = map) when is_map(map) do
    struct = struct(string_to_type(msgType))

    Enum.reduce(Map.to_list(struct), struct, fn {k, _}, acc ->
      case Map.fetch(map, Atom.to_string(k)) do
        {:ok, v} -> %{acc | k => from_map(v)}
        :error -> acc
      end
    end)
  end

  def from_map(any), do: any

  def type_to_string(structName) do
    @api_prefix <> type = structName |> to_string()
    type
  end

  def string_to_type(str) do
    try do
      (@api_prefix <> str) |> String.to_existing_atom()
    rescue
      ArgumentError -> Error.InvalidMsgType
    end
  end
end
