# https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/

defprotocol Fog.Integration.Jira.ADF do
  def render(ast, marks \\ [])
end

defimpl Fog.Integration.Jira.ADF, for: [List, Stream] do
  def render(ast, marks) do
    Enum.map(ast, &Fog.Integration.Jira.ADF.render(&1, marks))
  end
end

defimpl Fog.Integration.Jira.ADF, for: BitString do
  def render(string, marks), do: %{type: "text", text: string, marks: marks}
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.Linkify do
  def render(%{input: [input]}, marks) do
    Fog.Integration.Jira.ADF.render(input, marks)
  end
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.PreformattedCode do
  def render(%{input: input}, marks) do
    %{
      type: "codeBlock",
      content: Fog.Integration.Jira.ADF.render(input, marks)
    }
  end
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.Paragraph do
  def render(%{input: input}, marks) do
    %{
      type: "paragraph",
      content: Fog.Integration.Jira.ADF.render(input, marks)
    }
  end
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.LineBreak do
  def render(_ast, _marks), do: %{type: "hardBreak"}
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.Code do
  def render(%{input: [input]}, marks) do
    Fog.Integration.Jira.ADF.render(input, [%{type: "code"} | marks])
  end
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.FogLink do
  def render(%{input: [input], option: url}, marks) do
    Fog.Integration.Jira.ADF.render(input, [%{type: "link", attrs: %{href: url}} | marks])
  end
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.Emphasis do
  def render(%{input: [input]}, marks) do
    Fog.Integration.Jira.ADF.render(input, [%{type: "strong"} | marks])
  end
end

defimpl Fog.Integration.Jira.ADF, for: SimpleMarkdown.Attribute.Blockquote do
  def render(%{input: input}, marks) do
    %{
      type: "blockquote",
      content: Fog.Integration.Jira.ADF.render(input, marks)
    }
  end
end

defimpl Fog.Integration.Jira.ADF,
  for: [SimpleMarkdown.Attribute.Emphasis1, SimpleMarkdown.Attribute.Emphasis2] do
  def render(%{input: [input]}, marks) do
    Fog.Integration.Jira.ADF.render(input, [%{type: "em"} | marks])
  end
end
