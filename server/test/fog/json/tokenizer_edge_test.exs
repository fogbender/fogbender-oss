defmodule Fog.JsonTokenizerEdgeTest do
  use ExUnit.Case
  alias Fog.Json.Tokenizer

  test "returns :incomplete for an unterminated string" do
    # No closing quote
    assert Tokenizer.next_token(~s("incomplete)) == {:ok, {:partial_string, "incomplete"}, ""}
  end

  test "parses a string with multiple escapes" do
    json = ~s("Line1\\nLine2\\tTabbed\\u0021")
    expected = {:ok, {:string, "Line1\nLine2\tTabbed!"}, ""}
    assert Tokenizer.next_token(json) == expected
  end

  test "parses a number with exponent" do
    json = "1.23e-4"
    {:ok, token, rest} = Tokenizer.next_token(json)
    assert token == {:number, 0.000123}
    assert rest == ""
  end

  test "handles extra whitespace" do
    json = "   true  "
    # After whitespace, returns the boolean token then leftover whitespace.
    assert Tokenizer.next_token(json) == {:ok, {:boolean, true}, "  "}
  end

  test "parses negative numbers and integers" do
    json = "-42"
    {:ok, token, rest} = Tokenizer.next_token(json)
    assert token == {:number, -42.0}
    assert rest == ""
  end
end
