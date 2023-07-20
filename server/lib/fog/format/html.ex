defmodule Fog.Format.Html do
  import Fog.Format.Helpers, only: [earmark_options: 0]

  def parse(html) do
    {:ok, document} = Floki.parse_document(html)
    to_earmark_ast(document)
  end

  def render(ast) do
    prep = Earmark.Transform.make_postprocessor(earmark_options())
    ast = Earmark.Transform.map_ast(ast, prep, true)
    Earmark.Transform.transform(ast, earmark_options())
  end

  defp to_earmark_ast(document) when is_list(document) do
    Enum.map(document, &to_earmark_ast/1)
  end

  defp to_earmark_ast(binary) when is_binary(binary), do: binary

  defp to_earmark_ast({"script", _, _}), do: ""
  defp to_earmark_ast({"template", _, _}), do: ""
  defp to_earmark_ast({"style", _, _}), do: ""

  defp to_earmark_ast({tag, attrs, body}) do
    {tag, attrs, to_earmark_ast(body), %{}}
  end

  defp to_earmark_ast(_), do: ""
end
