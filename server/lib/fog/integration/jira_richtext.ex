defmodule Fog.Integration.Jira.RichText do
  def rules do
    [
      jira_preformatted: %{
        match: ~r/\A\{code[:a-z]*\}(.*?)\{code\}/s,
        rules: []
      },
      jira_preformatted: %{
        match: ~r/\A\{noformat\}(.*?)\{noformat\}/s,
        rules: []
      },
      jira_code: %{
        match: ~r/\A\{\{(.*?)\}\}/,
        rules: []
      },
      jira_url: %{
        match: ~r'\A\[(.+)\|(https?://.+?)(\|.*)?\]',
        rules: [],
        capture: 2,
        option: fn input, [_, _title = {index, length} | _] ->
          binary_part(input, index, length)
        end
      },
      jira_quote: ~r/\A\{quote\}(.+?)\{quote\}/s,
      jira_strong: ~r/\A\*(.+?)\*/
    ]
  end
end

defimpl Fog.Integration.Markdown, for: SimpleMarkdown.Attribute.JiraPreformatted do
  def render(%{input: input}), do: "\n```\n#{input}\n```\n"
end

defimpl Fog.Integration.Markdown, for: SimpleMarkdown.Attribute.JiraCode do
  def render(%{input: input}), do: "``#{input}``"
end

defimpl Fog.Integration.Markdown, for: SimpleMarkdown.Attribute.JiraUrl do
  def render(%{input: url, option: title}), do: "[#{title}](#{url})"
end

defimpl Fog.Integration.Markdown, for: SimpleMarkdown.Attribute.JiraQuote do
  def render(%{input: input}), do: "\n> " <> String.replace("#{input}", ~r/\n/m, "\n> ")
end

defimpl Fog.Integration.Markdown, for: SimpleMarkdown.Attribute.JiraStrong do
  def render(%{input: input}), do: "**#{input}**"
end
