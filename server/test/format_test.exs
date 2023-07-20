defmodule Test.Format do
  use ExUnit.Case
  alias Fog.{Format}

  describe "Html" do
    test "render urls with target: blank" do
      md = "[Google](https://google.com)"
      html = Format.Md.parse(md) |> Format.Html.render()

      assert html ==
               "<p><a href=\"https://google.com\" target=\"_blank\">Google</a></p>"
    end

    test "don't crash on HTML comments" do
      html = "<!-- Write your comments here -->
      <p>TEST</p>"
      md = Format.convert(html, Format.Html, Format.Md)
      assert md == "TEST"
    end

    test "ignore script tag" do
      html = "<script> alert('XSS Attack!!!') </script>
      <p>TEST</p>
      <div><script> alert('Another XSS Attack!!!') </scirpt></div>
      "
      md = Format.convert(html, Format.Html, Format.Md)
      assert md == "TEST"
    end

    test "don't crash on table tags" do
      html = ~s"""
      <p>
      <strong> BOLD </strong>
      </p>
      <table>
        <tbody>
          <tr><td>1</td></tr>
        </tbody>
      </table>
      <pre><code>
      LINE1
      </code></pre>
      """

      md = ~s"""
      **BOLD**


      <table>   <tbody>     <tr><td>1</td></tr>   </tbody> </table>


      ```

      LINE1

      ```\
      """

      html2 = ~s"""
      <p><strong>BOLD</strong></p><table><tbody>     <tr><td>1</td></tr>   </tbody></table><pre><code>
      LINE1
      </code></pre>\
      """

      assert md == Format.convert(html, Format.Html, Format.Md)

      assert html2 == Format.convert(md, Format.Md, Format.Html)
    end

    test "don't crash on tables with spans" do
      html = """
        <table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
        <tbody>
        <tr>
        <td valign="top" style="border:solid #9A9A9A 1.0pt;padding:.75pt 3.75pt .75pt 3.75pt">
        <p class="MsoNormal" style="mso-margin-top-alt:auto;mso-margin-bottom-alt:auto"><span style="font-family:&quot;Helvetica Neue&quot;">SomeSwiftPackage version
        </span></p>
        </td>
        <td valign="top" style="border:solid #9A9A9A 1.0pt;border-left:none;padding:.75pt 3.75pt .75pt 3.75pt">
        <p class="MsoNormal" style="mso-margin-top-alt:auto;mso-margin-bottom-alt:auto"><span style="font-family:&quot;Helvetica Neue&quot;">App crashes on fatalError&nbsp;
        </span></p>
        </td>
        </tr>
        </tbody>
        </table>
      """

      md = """
      <table>   <tbody>   <tr>   <td>   <p><span>SomeSwiftPackage version   </span></p>   </td>   <td>   <p><span>App crashes on fatalError    </span></p>   </td>   </tr>   </tbody>   </table>\
      """

      assert md == Format.convert(html, Format.Html, Format.Md)
    end
  end

  describe "Plain" do
    test "render link title without url if present" do
      md = "Link with title: [Google](https://google.com) Link without title: https://yahoo.com"
      plain = Format.convert(md, Format.Md, Format.Plain)

      assert plain ==
               "Link with title: Google Link without title: https://yahoo.com"
    end

    test "render image caption without url if present" do
      md =
        "Image with catpion: ![Google logo](https://google.com/logo.png) Image without caption: ![](https://yahoo.com/logo.png)"

      plain = Format.convert(md, Format.Md, Format.Plain)

      assert plain ==
               "Image with catpion: Google logo Image without caption: <img>"
    end
  end

  describe "Markdown" do
    test "allow brackets in urls" do
      html =
        "[Erlang](https://wikipedia.com/wiki/Erlang_(programming_language))"
        |> Format.convert(Format.Md, Format.Html)

      assert html ==
               "<p><a href=\"https://wikipedia.com/wiki/Erlang_(programming_language)\" target=\"_blank\">Erlang</a></p>"
    end

    test "support sup/sub tags" do
      md = "A~sub~ B^sup^"
      html = "<p>A<sub>sub</sub> B<sup>sup</sup></p>"
      plain = "Asub Bsup"
      assert html == Format.convert(md, Format.Md, Format.Html)
      assert md == Format.convert(html, Format.Html, Format.Md)
      assert plain == Format.convert(md, Format.Md, Format.Plain)
    end

    test "support b/i tags" do
      html = "<strong>A</strong>&nbsp;<b>B</b>&nbsp;<em>C</em>&nbsp;<i>D</i>"
      md = "**A** **B** *C* *D*"
      plain = "A B C D"
      assert md == Format.convert(html, Format.Html, Format.Md)
      assert plain == Format.convert(html, Format.Html, Format.Plain)
    end

    test "don't crash on rendering unknown tag" do
      html = "<div><p><strong>BOLD</strong></p></div>"
      md = "**BOLD**"
      plain = "BOLD"
      assert md == Format.convert(html, Format.Html, Format.Md)
      assert plain == Format.convert(html, Format.Html, Format.Plain)
    end

    test "don't crash on parsing invalid formatting" do
      md = "test\n\n```\nLINE1"
      html = "<p>test</p><pre><code>LINE1</code></pre>"
      assert html == Format.convert(md, Format.Md, Format.Html)
    end
  end

  describe "Mention" do
    test "parse mentions as <b class='mention'>" do
      md = "Hello @User 1 and @User 11"
      mentions = ["User 1", "User 11"]
      html = "<p>Hello <b class=\"mention\">@User 1</b> and <b class=\"mention\">@User 11</b></p>"

      assert html ==
               md
               |> Format.Md.parse()
               |> Format.parse_mentions(mentions)
               |> Format.Html.render()
    end

    test "ignore mentions in code blocks" do
      md = "Hello `@User 1 inline`\n\n```\n and @User 11\n```\n Out of block: @User 1"
      mentions = ["User 1", "User 11"]

      html =
        "<p>Hello <code class=\"inline\">@User 1 inline</code></p><pre><code> and @User 11</code></pre><p> Out of block: <b class=\"mention\">@User 1</b></p>"

      assert html ==
               md
               |> Format.Md.parse()
               |> Format.parse_mentions(mentions)
               |> Format.Html.render()
    end

    test "keep spaces between mentions in html" do
      md = "Hello @User 1 @User 2, I need help!"
      mentions = ["User 1", "User 2"]

      html =
        "<p>Hello <b class=\"mention\">@User 1</b> <b class=\"mention\">@User 2</b>, I need help!</p>"

      assert html ==
               md
               |> Format.Md.parse()
               |> Format.parse_mentions(mentions)
               |> Format.Html.render()
    end
  end

  describe "Images" do
    test "convert_with_images" do
      html = ~s"""
      <div>
        TEST<span>
             <img src="https://graph.microsoft.com/v1.0/teams/5070d8d9-dc22-4de2-b292-2c6aefb5be4f/channels/19:test@thread.tacv2/messages/1672252892451/replies/1673021104708/hostedContents/some_long_token/$value"
                width="351.7025089605735" height="250" style="vertical-align:bottom; width:785px; height:250px">
          </span>
      <img src="https://test.example.com">
      """

      md = "TEST"

      urls = [
        "https://graph.microsoft.com/v1.0/teams/5070d8d9-dc22-4de2-b292-2c6aefb5be4f/channels/19:test@thread.tacv2/messages/1672252892451/replies/1673021104708/hostedContents/some_long_token/$value",
        "https://test.example.com"
      ]

      assert {md, urls} == html |> Format.convert_with_images(Format.Html, Format.Md)
    end
  end

  describe "Code" do
    test "convert pre HTML with span inside into multiline Markdown pre section" do
      html = """
      <pre><code>Code <span>line</span> 1
        Code <span>line</span> 2</code></pre>
      """

      md = """
      ```
      Code line 1
        Code line 2
      ```\
      """

      assert md == Format.convert(html, Format.Html, Format.Md)
    end

    test "allow additional code information in MD pre block" do
      md = """
      ```python
      Line1
      Line2
      ```\
      """

      html = """
      <pre><code class="language-python">Line1
      Line2</code></pre>\
      """

      assert html == Format.convert(md, Format.Md, Format.Html)
      assert md == Format.convert(html, Format.Html, Format.Md)
    end

    test "ignore non-supported languages in code block" do
      html = ~s(<pre><code class="language-invalid">Line1</code></pre>)

      md = """
      ```
      Line1
      ```\
      """

      assert md == Format.convert(html, Format.Html, Format.Md)

      md = """
      ```invalid
      Line1
      ```\
      """

      html = ~s(<pre><code>Line1</code></pre>)
      assert html == Format.convert(md, Format.Md, Format.Html)
    end

    test "keep leading whitespace in code blocks" do
      html = ~s"""
      <pre><code>
        <span>def</span> <span>fun1</span>(<span>arg1</span>) <span>do</span>
          <span>Logger</span>.<span>info</span> <span>arg1</span>
        <span>end</span>
      </code></pre>
      """

      md = """
      ```

        def fun1(arg1) do
          Logger.info arg1
        end

      ```\
      """

      assert md == Format.convert(html, Format.Html, Format.Md)
    end
  end
end
