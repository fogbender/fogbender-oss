defmodule Fog.Format.Plain do
  import Fog.Format.Helpers

  def render(ast) do
    build_plain([], ast)
    |> IO.iodata_to_binary()
    |> String.trim()
  end

  defp build_plain(iodata, []), do: iodata

  defp build_plain(iodata, [string | ast]) when is_binary(string) do
    string
    |> append_inline(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{tag, attrs, lines, %{verbatim: true}} | ast]) do
    render_html(tag, attrs, lines)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"code", _, content, %{}} | ast]) do
    render(content)
    |> append_inline(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"a", attrs, content, %{}} | ast]) do
    render_link(content, attrs)
    |> append_inline(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"img", attrs, _, %{}} | ast]) do
    render_image(attrs)
    |> append_inline(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{:comment, _, _lines, %{comment: true}} | ast]) do
    build_plain(iodata, ast)
  end

  defp build_plain(iodata, [{"hr", _, [], %{}} | ast]) do
    "---------"
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"br", _, [], %{}} | ast]) do
    "\n"
    |> append_inline(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"p", _, content, %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"h" <> _n, _, content, %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"pre", _, [{"code", _, content, %{}}], %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"blockquote", [], content, %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"table", _, _content, %{}} | ast]) do
    "<table>"
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"ul", _, content, %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"ol", _, content, %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{"li", _, content, %{}} | ast]) do
    render(content)
    |> append_block(iodata)
    |> build_plain(ast)
  end

  defp build_plain(iodata, [{_, _, content, %{}} | ast]) do
    render(content)
    |> append_inline(iodata)
    |> build_plain(ast)
  end

  defp render_link(content, attrs) do
    href = get_attr(attrs, "href", "")

    case content do
      [^href] -> render([href])
      [] -> render([href])
      _ -> render(content)
    end
  end

  defp render_image(attrs) do
    alt = get_attr(attrs, "alt", "")

    if alt == "",
      do: "<img>",
      else: alt
  end
end
