defmodule Fog.StreamingParserTest do
  use ExUnit.Case, async: true

  alias Fog.Json.StreamingParser

  describe "add_chunk/2 and path/2" do
    test "processes complete JSON in one chunk" do
      state = StreamingParser.new()
      state = StreamingParser.add_chunk(state, "{\"response\":\"Hello there!\"}")
      assert StreamingParser.path(state, ["response"]) == {:ok, "Hello there!"}
    end

    test "processes JSON in multiple chunks (partial then complete)" do
      state = StreamingParser.new()
      state = StreamingParser.add_chunk(state, "{\"response\":\"Hello")
      # At this point the value is still partial.
      assert StreamingParser.path(state, ["response"]) == {:partial, "Hello"}
      state = StreamingParser.add_chunk(state, " there!\"}")
      assert StreamingParser.path(state, ["response"]) == {:ok, "Hello there!"}
    end

    test "returns :not_processed for missing keys" do
      state = StreamingParser.new()
      state = StreamingParser.add_chunk(state, "{\"foo\":\"bar\"}")
      assert StreamingParser.path(state, ["response"]) == :not_processed
    end

    test "processes nested JSON objects" do
      state = StreamingParser.new()
      state = StreamingParser.add_chunk(state, "{\"data\":{\"response\":\"Nested")
      assert StreamingParser.path(state, ["data", "response"]) == {:partial, "Nested"}
      state = StreamingParser.add_chunk(state, " value\"}}")
      assert StreamingParser.path(state, ["data", "response"]) == {:ok, "Nested value"}
    end

    test "handles several small chunks" do
      state = StreamingParser.new()

      chunks = [
        "{\"response\":\"H",
        "ello",
        " there",
        "!\"}"
      ]

      state =
        Enum.reduce(chunks, state, fn chunk, acc ->
          StreamingParser.add_chunk(acc, chunk)
        end)

      assert StreamingParser.path(state, ["response"]) == {:ok, "Hello there!"}
    end

    test "handles empty chunk continuation" do
      state = StreamingParser.new()
      state = StreamingParser.add_chunk(state, "{\"response\":\"Hello")
      assert StreamingParser.path(state, ["response"]) == {:partial, "Hello"}
      # Adding an empty chunk should not change the partial value.
      state = StreamingParser.add_chunk(state, "")
      assert StreamingParser.path(state, ["response"]) == {:partial, "Hello"}
    end

    test "handles empty chunk during an incomplete escape sequence" do
      state = StreamingParser.new()
      # Feed a chunk ending with an incomplete escape (a trailing backslash).
      state = StreamingParser.add_chunk(state, "{\"response\":\"Test\\")
      assert StreamingParser.path(state, ["response"]) == {:partial, "Test\\"}
      # Feeding an empty chunk should trigger our new clause in parse_string_complete_preserve/2.
      state = StreamingParser.add_chunk(state, "")
      assert StreamingParser.path(state, ["response"]) == {:partial, "Test\\"}
    end
  end
end
