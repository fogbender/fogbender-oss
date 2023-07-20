defmodule Fog.AstToPlain do
  def convert(%{ast: ast}) do
    acc = ast_to_plain([], ast)

    case acc |> Enum.reverse() |> Enum.join() do
      "\n\n" <> plain ->
        plain

      plain ->
        plain
    end
  end

  def ast_to_plain(acc, []) do
    acc
  end

  def ast_to_plain(acc, [c | t]) when is_list(c) do
    ast_to_plain(ast_to_plain(acc, c), t)
  end

  def ast_to_plain(acc, [c | t]) when is_binary(c) do
    ast_to_plain([c | acc], t)
  end

  def ast_to_plain(acc, [{:img, _attrs, _} | t]) do
    ast_to_plain(["(file) " | acc], t)
  end

  def ast_to_plain(acc, [{:br, _, c} | t]) do
    ast_to_plain(ast_to_plain(["\n\n" | acc], c), t)
  end

  def ast_to_plain(acc, [{e, _, c} | t]) when e in [:p, :ul, :ok, :li] do
    ast_to_plain(ast_to_plain(["\n\n" | acc], c), t)
  end

  def ast_to_plain(acc, [{_, _, c} | t]) do
    ast_to_plain(ast_to_plain(acc, c), t)
  end
end
