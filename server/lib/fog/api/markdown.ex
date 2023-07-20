defmodule Fog.Api.Markdown do
  def rules do
    [
      # ``` code\n block```
      # higher priority, do not apply paragraph/line_break rules
      preformatted_code: %{
        match: ~r/\A`{3}.*?\n(.*?)`{3}/s,
        format: &String.replace_suffix(&1, "\n", ""),
        rules: []
      },

      # \n\n paragrpah
      paragraph: %{match: ~r/\A((.|\n)*?)\n{2,}/, capture: 1},

      # \n br
      line_break: %{match: ~r/\A\n/, format: ""},

      # everthing within paragraph
      paragraph: %{match: ~r/\A(.|\n)*(\n|\z)/, capture: 0},

      # `escaped ``cod`e``
      code: %{match: ~r/\A``(.*)``/, rules: []},

      # `code`
      code: %{match: ~r/\A`([^`].*?)`/, rules: []},

      # [title](url)
      # this is an exact copy of the default link rule - we need custom renderer below
      fog_link: %{
        match: fn
          "[" <> input ->
            if Regex.match?(~r/\A.*?\]\(.*\)/, input) do
              find_end = fn
                "[" <> string, _, n, fun ->
                  fun.(string, :inner_mid, n + 1, fun)

                "](" <> string, :inner_mid, n, fun ->
                  fun.(string, :inner_end, n + 2, fun)

                ")" <> string, :inner_end, n, fun ->
                  fun.(string, :mid, n + 1, fun)

                "](" <> string, :mid, n, fun ->
                  fun.(string, :end, n + 2, fun)

                ")" <> _, :end, n, _ ->
                  n + 1

                <<c::utf8, string::binary>>, token, n, fun ->
                  fun.(string, token, n + byte_size(to_string([c])), fun)

                "", _, n, _ ->
                  n
              end

              [{0, find_end.(input, :mid, 1, find_end)}]
            else
              nil
            end

          _ ->
            nil
        end,
        format: fn input ->
          [_, title, _] = Regex.run(~r/\A\[(.*?)\]\(([^\)\n]*?)\)$/, input)
          title
        end,
        option: fn input, [{index, length} | _] ->
          [_, _, link] =
            Regex.run(~r/\A\[(.*?)\]\(([^\)\n]*?)\)$/, binary_part(input, index, length))

          link
        end
      },

      # use linkify to detect links
      linkify: %{
        match: fn input ->
          with nil <- Regex.run(~r/\A[[:alnum:]]+:\/\/[[:alnum:]]\S*/, input, capture: :first),
               nil <- Regex.run(~r/\A\s[[:alnum:]]\S*/, input, capture: :first),
               nil do
            nil
          else
            [url] ->
              if Linkify.link(url) == url do
                nil
              else
                [{0, byte_size(url)}]
              end
          end
        end,
        rules: []
      },

      # these rules are from simple_markdown/lib/simple_markdown/rules.exs

      # **emphasis**
      emphasis: %{match: ~r/\A\*\*(.+?)\*\*/, option: :strong, exclude: {:emphasis, :strong}},

      # __emphasis__
      emphasis: %{match: ~r/\A__(.+?)__/, option: :strong, exclude: {:emphasis, :strong}},

      # > blockquote
      skip_blockquote: %{
        match: ~r/\A[^>]*[^> \n]+.*?>.*(\n([[:blank:]]|>).*)*/,
        capture: 0,
        exclude: [:skip_blockquote, :blockquote],
        skip: true
      },
      blockquote: %{
        match: ~r/\A>.*(\n([[:blank:]]|>).*)*/,
        capture: 0,
        format: &String.replace(&1, ~r/^> ?/m, ""),
        exclude: nil
      },

      # our custom rules

      # *emphasis1*
      skip_emphasis1: %{
        match: ~r/\A([^\*\s]+)\*/,
        capture: 0,
        exclude: [:skip_emphasis1, :emphasis1],
        skip: true
      },
      emphasis1: %{
        match: fn input ->
          case Regex.run(~r/\A\*(.+?)\*(\W|\s|\z)/, input, return: :index) do
            [{0, total_len}, content, {_, close_len}] ->
              [{0, total_len - close_len}, content]

            _ ->
              nil
          end
        end,
        rules: []
      },

      # *emphasis2*
      skip_emphasis2: %{
        match: ~r/\A([^_\s]+)_/,
        capture: 0,
        exclude: [:skip_emphasis2, :emphasis2],
        skip: true
      },
      emphasis2: %{
        match: fn input ->
          case Regex.run(~r/\A_(.+?)_(\W|\s|\z)/, input, return: :index) do
            [{0, total_len}, content, {_, close_len}] ->
              [{0, total_len - close_len}, content]

            _ ->
              nil
          end
        end,
        rules: []
      }
    ]
  end
end

defimpl SimpleMarkdown.Renderer.HTML.AST, for: SimpleMarkdown.Attribute.FogLink do
  def render(%{input: input, option: url}),
    do: {:a, [href: url, target: "_blank"], SimpleMarkdown.Renderer.HTML.AST.render(input)}
end

defimpl SimpleMarkdown.Renderer.HTML.AST, for: SimpleMarkdown.Attribute.Linkify do
  def render(%{input: [input]}) do
    link = Linkify.link(input, new_window: true)
    SimpleMarkdown.Renderer.HTML.Utilities.html_to_ast(link)
  end
end

defimpl SimpleMarkdown.Renderer.HTML.AST, for: SimpleMarkdown.Attribute.Emphasis1 do
  def render(%{input: input}), do: {:i, [], SimpleMarkdown.Renderer.HTML.AST.render(input)}
end

defimpl SimpleMarkdown.Renderer.HTML.AST, for: SimpleMarkdown.Attribute.Emphasis2 do
  def render(%{input: input}), do: {:i, [], SimpleMarkdown.Renderer.HTML.AST.render(input)}
end

#
# Plain text
#
defprotocol Fog.Api.Markdown.PlainText do
  @fallback_to_any true
  def render(ast)
end

defimpl Fog.Api.Markdown.PlainText, for: [List, Stream] do
  def render(ast) do
    Enum.map(ast, &Fog.Api.Markdown.PlainText.render/1)
    |> IO.chardata_to_string()
  end
end

defimpl Fog.Api.Markdown.PlainText, for: BitString do
  def render(string), do: string
end

defimpl Fog.Api.Markdown.PlainText, for: SimpleMarkdown.Attribute.LineBreak do
  def render(_ast), do: "\n"
end

defimpl Fog.Api.Markdown.PlainText, for: Any do
  def render(%{input: input}) do
    Fog.Api.Markdown.PlainText.render(input)
  end
end
