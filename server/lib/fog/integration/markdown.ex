defprotocol Fog.Integration.Markdown do
  def render(ast)
end

defimpl Fog.Integration.Markdown, for: [List, Stream] do
  def render(ast) do
    Enum.map(ast, &Fog.Integration.Markdown.render/1)
    |> IO.chardata_to_string()
  end
end

defimpl Fog.Integration.Markdown, for: BitString do
  def render(string), do: string
end
