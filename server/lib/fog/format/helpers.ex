defmodule Fog.Format.Helpers do
  def append_inline(text, iodata), do: [iodata, text]
  def append_block(text, iodata), do: [iodata, "\n", text, "\n"]

  # https://www.w3.org/TR/2011/WD-html-markup-20110113/syntax.html#void-element
  @void_elements ~W(area base br col command embed hr img input keygen link meta param source track wbr)

  @allowed_tags ~W(
    p b i br strong em pre code a blockquote sup hr s span
    ul ol li
    table th tr td caption colgroup col thead tbody tfoot
  )

  def render_html(tag, attrs, []) when tag in @void_elements do
    ["<", tag, attrs_to_string(attrs), " />"]
  end

  def render_html(tag, attrs, lines) do
    inner = Enum.intersperse(lines, "\n")
    ["<", tag, attrs_to_string(attrs), ">\n", inner, "\n</", tag, ">"]
  end

  def filter_tags([]), do: []

  def filter_tags([elm | rest]) do
    case filter_tags(elm) do
      [] -> filter_tags(rest)
      elm -> [elm | filter_tags(rest)]
    end
  end

  def filter_tags(binary) when is_binary(binary), do: binary

  def filter_tags({name, _attrs, content, meta}) when name in @allowed_tags do
    {name, [], filter_tags(content), meta}
  end

  def filter_tags({_, _, content, _}), do: filter_tags(content) |> List.flatten()

  def spaced_list_items?([{"li", _, [{"p", _, _content, %{}} | _], %{}} | _items]), do: true
  def spaced_list_items?([_ | items]), do: spaced_list_items?(items)
  def spaced_list_items?([]), do: false

  def get_attr(attrs, key, default) do
    Enum.find_value(attrs, default, fn {attr_key, attr_value} ->
      attr_key == key && attr_value
    end)
  end

  def attrs_to_string(attrs) do
    Enum.map(attrs, fn {key, value} -> ~s/ #{key}="#{value}"/ end)
  end

  def blank?(string), do: String.trim(string) == ""

  def code_block_delimiter(code) do
    max_streak =
      Regex.scan(~r/`{3,}/, code)
      |> Enum.map(fn [string] -> byte_size(string) end)
      |> Enum.max(&>=/2, fn -> 2 end)

    String.duplicate("`", max_streak + 1)
  end

  def normalize_comment_lines(lines)

  def normalize_comment_lines([line]) do
    [String.trim(line)]
  end

  def normalize_comment_lines(lines) do
    lines
    |> Enum.drop_while(&blank?/1)
    |> Enum.reverse()
    |> Enum.drop_while(&blank?/1)
    |> Enum.reverse()
  end

  def earmark_options() do
    Earmark.Options.make_options!(
      compact_output: true,
      breaks: true,
      sub_sup: true,
      registered_processors: [
        {"a", &Earmark.AstTools.merge_atts_in_node(&1, target: "_blank")},
        {"code", &code_lang_processor/1}
      ]
    )
  end

  def code_lang_processor({"code", attrs, content, meta} = node) do
    case get_attr(attrs, "class", "") do
      "" ->
        node

      "inline" ->
        node

      class ->
        attrs = block_code_class_process(class)
        {"code", attrs, content, meta}
    end
  end

  defp block_code_class_process(class) do
    case render_language_class(class) do
      "" -> []
      lang -> [{"class", lang}]
    end
  end

  def parse_language_class(class) when is_binary(class) do
    for(
      cs <- String.split(class, [" ", "language-"], trim: true),
      lang <- supported_hljs_languages(),
      cs == lang,
      do: lang
    )
    |> List.first()
    |> Fog.Utils.coalesce("")
  end

  def parse_language_class(_), do: ""

  def render_language_class(class) do
    case parse_language_class(class) do
      "" -> ""
      lang -> "language-#{lang}"
    end
  end

  def supported_hljs_languages() do
    [
      "xml",
      "bash",
      "c",
      "cpp",
      "csharp",
      "css",
      "markdown",
      "diff",
      "ruby",
      "go",
      "ini",
      "java",
      "javascript",
      "json",
      "kotlin",
      "less",
      "lua",
      "makefile",
      "perl",
      "objectivec",
      "php",
      "php-template",
      "plaintext",
      "python",
      "python-repl",
      "r",
      "rust",
      "scss",
      "shell",
      "sql",
      "swift",
      "yaml",
      "typescript",
      "vbnet"
    ]
  end
end
