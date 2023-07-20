defmodule Fog.Format.Mention do
  def parse(ast, []), do: ast
  def parse([], _), do: []

  def parse([t | ast], mentions),
    do: [parse(t, mentions) | parse(ast, mentions)] |> List.flatten()

  def parse({"code", _, _, _} = code, _), do: code

  def parse({tag, attrs, content, meta}, mentions),
    do: {tag, attrs, parse(content, mentions), meta}

  def parse(s, mentions) when is_binary(s) do
    case :binary.matches(s, mentions) do
      [] -> s
      matches -> replace(s, matches, fn subj -> {"b", [{"class", "mention"}], [subj], %{}} end)
    end
  end

  def replace(s, matches, func, shift \\ 0)
  def replace(s, [], _, _), do: [s]

  def replace(s, [{start, len} | rest], func, shift) do
    start = start - shift

    case s do
      <<prev::binary-size(start), subj::binary-size(len), next::binary>> ->
        [prev, func.(subj) | replace(next, rest, func, shift + start + len)]

      _ ->
        [s]
    end
  end
end
