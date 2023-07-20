markdown = """
Hello, _italic_ and **bold** and _**bold-italic**_!
-strike out- and [some url](https://ya.ru).
`inline code` and

```
multi
line
code
```
"""

tests = %{
  "SimpleMarkdown" => fn -> Fog.Api.Event.Message.to_parsed(markdown, []) end,
  "Earmark" => fn -> Earmark.as_html!(markdown, compact_output: true) end,
  "Cmark (NIF)" => fn -> Cmark.to_html(markdown) end,
  "Md" => fn -> Md.generate(markdown, Md.Parser.Default, format: :none) end
}

Benchee.run(tests)

for {name, fun} <- tests do
    IO.puts ""
    IO.puts ""
    IO.puts "#{name} result"
    IO.puts ""
    IO.puts "--8<---------------------------------"
    IO.puts (fun.())
    IO.puts "--8<---------------------------------"
end
