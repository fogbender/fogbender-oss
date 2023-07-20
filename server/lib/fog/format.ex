defmodule Fog.Format do
  @moduledoc """
  Utilities for different text formatting.
  Intermediate presentation is AST from EarmarkParser:

  `{"tag", attributes, childs, meta}`

  All text formats converts to/from it.
  """

  import Fog.Format.Helpers, only: [get_attr: 3]

  @type t :: ast | [ast]
  @type ast :: tag | String.t()
  @type tag :: {tag_name, [{attr_name, attr_value}], t, meta}
  @type tag_name :: String.t()
  @type attr_name :: String.t()
  @type attr_value :: String.t()
  @type meta :: Map.t()

  @mods [
    Fog.Format.Md,
    Fog.Format.Html,
    Fog.Format.Plain
  ]

  def convert(data, from_mod, to_mod) when from_mod in @mods and to_mod in @mods do
    data
    |> from_mod.parse()
    |> to_mod.render()
  end

  # we keep mentions without @, so let's add it here
  def parse_mentions(ast, mentions) when is_list(mentions) do
    mentions = Enum.map(mentions, &"@#{&1}")
    Fog.Format.Mention.parse(ast, mentions)
  end

  # extracts img urls and removes img tags
  @spec parse_images(ast()) :: {ast(), [String.t()]}
  def parse_images(ast) do
    trans = fn
      {"img", attrs, _, _}, acc ->
        acc = [get_attr(attrs, "src", []) | acc]
        {{"span", [], [], %{}}, acc}

      node, acc ->
        {node, acc}
    end

    {ast, urls} = Earmark.Transform.map_ast_with(ast, [], trans, true)
    {ast, Enum.reverse(urls)}
  end

  # extracts urls
  @spec parse_urls(ast()) :: {ast(), [String.t()]}
  def parse_urls(ast) do
    trans = fn
      {"a", attrs, _, _} = node, acc ->
        acc = [get_attr(attrs, "href", []) | acc]
        {node, acc}

      node, acc ->
        {node, acc}
    end

    {ast, urls} = Earmark.Transform.map_ast_with(ast, [], trans, true)
    {ast, Enum.reverse(urls)}
  end

  def convert_with_images(data, from_mod, to_mod) when from_mod in @mods and to_mod in @mods do
    {parsed, images} =
      data
      |> from_mod.parse()
      |> parse_images()

    rendered = to_mod.render(parsed)

    {rendered, images}
  end

  def convert_with_urls(data, from_mod, to_mod) when from_mod in @mods and to_mod in @mods do
    {parsed, urls} =
      data
      |> from_mod.parse()
      |> parse_urls()

    rendered = to_mod.render(parsed)

    {rendered, urls}
  end
end
