defimpl String.Chars, for: Tuple do
  # https://elixirschool.com/en/lessons/advanced/protocols/#implementing-a-protocol
  def to_string(tuple) do
    interior =
      tuple
      |> Tuple.to_list()
      |> Enum.map(&Fog.Utils.ToString.to_str/1)
      |> Enum.join(", ")

    "{#{interior}}"
  end
end

defimpl String.Chars, for: Map do
  def to_string(map) do
    to_str = &Fog.Utils.ToString.to_str/1
    is_short = Map.keys(map) |> Enum.all?(&is_atom/1)

    interior =
      map
      |> Map.to_list()
      |> Enum.map(fn {k, v} ->
        if is_short do
          "#{Kernel.to_string(k)}: #{to_str.(v)}"
        else
          "#{to_str.(k)} => #{to_str.(v)}"
        end
      end)
      |> Enum.join(", ")

    "%{#{interior}}"
  end
end

defimpl String.Chars, for: Pid do
  def to_string(pid) do
    Fog.Utils.ToString.to_str(pid)
  end
end

defmodule Fog.Utils.ToString do
  def to_str(pid) when is_pid(pid) do
    # https://stackoverflow.com/a/28025310/74167
    str = to_string(:erlang.pid_to_list(pid))
    str = String.slice(str, 1, String.length(str) - 2)
    "pid(\"#{str}\")"
  end

  def to_str(term) when is_atom(term) or is_binary(term) or is_map(term) or is_tuple(term) do
    inspect(term)
  end

  def to_str(term) do
    Kernel.to_string(term)
  end
end
