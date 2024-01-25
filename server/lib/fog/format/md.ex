defmodule Fog.Format.Md do
  import Fog.Format.Helpers
  require Logger

  @max_size 5000

  def parse(text) when byte_size(text) > @max_size do
    [{"pre", [], [{"code", [], [text], %{}}], %{}}]
  end

  def parse(md) do
    case Earmark.Parser.as_ast(md, earmark_options()) do
      {:ok, ast, _} ->
        ast

      {:error, ast, errors} ->
        Logger.warning("Error processing markdown:\n #{md}:\n\n #{inspect(errors)}")
        ast
    end
  end

  # Extracted from livebook project
  def render(ast) do
    render_raw(ast)
    |> String.trim()
  end

  defp render_raw(ast) do
    build_md([], ast)
    |> IO.iodata_to_binary()
  end

  defp build_md(iodata, []), do: iodata

  defp build_md(iodata, [string | ast]) when is_binary(string) do
    string
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{tag, attrs, lines, %{verbatim: true}} | ast]) do
    render_html(tag, attrs, lines)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"sup", _, content, %{}} | ast]) do
    render_sup(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"sub", _, content, %{}} | ast]) do
    render_sub(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{em, _, content, %{}} | ast]) when em in ["em", "i"] do
    render_emphasis(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{strong, _, content, %{}} | ast]) when strong in ["strong", "b"] do
    render_strong(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"del", _, content, %{}} | ast]) do
    render_strikethrough(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"code", _, content, %{}} | ast]) do
    render_code_inline(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"a", attrs, content, %{}} | ast]) do
    render_link(content, attrs)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"img", attrs, [], %{}} | ast]) do
    render_image(attrs)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{:comment, _, lines, %{comment: true}} | ast]) do
    render_comment(lines)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"hr", attrs, [], %{}} | ast]) do
    render_ruler(attrs)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"br", _, [], %{}} | ast]) do
    render_line_break()
    |> append_inline(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"p", _, content, %{}} | ast]) do
    render_paragraph(content)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"h" <> n, _, content, %{}} | ast])
       when n in ["1", "2", "3", "4", "5", "6"] do
    n = String.to_integer(n)

    render_heading(n, content)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"pre", _, [{"code", attrs, content, %{}}], %{}} | ast]) do
    content
    |> render_code_block(attrs)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"blockquote", [], content, %{}} | ast]) do
    render_blockquote(content)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"table", _, _, %{}} = table | ast]) do
    render_table(table)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"ul", _, content, %{}} | ast]) do
    render_unordered_list(content)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{"ol", _, content, %{}} | ast]) do
    render_ordered_list(content)
    |> append_block(iodata)
    |> build_md(ast)
  end

  defp build_md(iodata, [{_, _, content, %{}} | ast]) do
    render(content)
    |> append_inline(iodata)
    |> build_md(ast)
  end

  # Renderers
  defp render_sup(content) do
    inner = render(content)
    ["^", inner, "^"]
  end

  defp render_sub(content) do
    inner = render(content)
    ["~", inner, "~"]
  end

  defp render_emphasis(content) do
    inner = render(content)
    ["*", inner, "*"]
  end

  defp render_strong(content) do
    inner = render(content)
    ["**", inner, "**"]
  end

  defp render_strikethrough(content) do
    inner = render(content)
    ["~~", inner, "~~"]
  end

  defp render_code_inline(content) do
    inner = render_raw(content)
    ["`", inner, "`"]
  end

  defp render_link(content, attrs) do
    caption = build_md([], content)
    href = get_attr(attrs, "href", "")
    ["[", caption, "](", href, ")"]
  end

  defp render_image(attrs) do
    alt = get_attr(attrs, "alt", "")
    src = get_attr(attrs, "src", "")
    title = get_attr(attrs, "title", "")

    if title == "" do
      ["![", alt, "](", src, ")"]
    else
      ["![", alt, "](", src, ~s/ "/, title, ~s/")/]
    end
  end

  defp render_comment(lines) do
    case normalize_comment_lines(lines) do
      [line] -> ["<!-- ", line, " -->"]
      lines -> ["<!--\n", Enum.intersperse(lines, "\n"), "\n-->"]
    end
  end

  defp render_ruler(attrs) do
    class = get_attr(attrs, "class", "thin")

    case class do
      "thin" -> "---"
      "medium" -> "___"
      "thick" -> "***"
    end
  end

  defp render_line_break(), do: "\\\n"

  defp render_paragraph(content), do: render(content)

  defp render_heading(n, content) do
    title = build_md([], content)
    [String.duplicate("#", n), " ", title]
  end

  defp render_code_block(content, attrs) do
    content = render_raw(content)
    delimiter = code_block_delimiter(content)
    language = parse_language_class(get_attr(attrs, "class", "")) || ""
    [delimiter, language, "\n", content, "\n", delimiter]
  end

  defp render_blockquote(content) do
    inner = render(content)

    inner
    |> String.split("\n")
    |> Enum.map_intersperse("\n", &["> ", &1])
  end

  defp render_table(html_table) do
    filter_tags([html_table])
    |> Fog.Format.Html.render()
  end

  defp render_unordered_list(content) do
    marker_fun = fn _index -> "* " end
    render_list(content, marker_fun, "  ")
  end

  defp render_ordered_list(content) do
    marker_fun = fn index -> "#{index + 1}. " end
    render_list(content, marker_fun, "   ")
  end

  defp render_list(items, marker_fun, indent) do
    spaced? = spaced_list_items?(items)
    item_separator = if(spaced?, do: "\n\n", else: "\n")

    items
    |> Enum.map(fn
      {"li", _, content, %{}} -> render(content)
      _ -> []
    end)
    |> List.flatten()
    |> Enum.with_index()
    |> Enum.map(fn {inner, index} ->
      [first_line | lines] = String.split(inner, "\n")

      first_line = [marker_fun.(index), first_line]

      lines =
        Enum.map(lines, fn
          "" -> ""
          line -> [indent, line]
        end)

      Enum.intersperse([first_line | lines], "\n")
    end)
    |> Enum.intersperse(item_separator)
  end
end
