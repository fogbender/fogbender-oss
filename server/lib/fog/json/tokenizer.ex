defmodule Fog.Json.Tokenizer do
  @moduledoc """
  A basic JSON tokenizer that emits complete and partial string tokens.

  It handles structural tokens, numbers, booleans, null,
  and strings. For strings it supports two tokens:
    - {:string, value} for complete strings.
    - {:partial_string, value} for an in-progress string.
  """

  @doc """
  Returns the next token from the given binary.

  Tokens include:
    - :begin_object, :end_object, :begin_array, :end_array, :colon, :comma
    - {:string, value} for complete JSON strings
    - {:partial_string, value} for a partial (in-progress) string
    - {:number, value} for numbers
    - {:boolean, true|false} and {:null, nil}

  If not enough data is available to determine any token, returns :incomplete.
  """
  def next_token(binary) when is_binary(binary) do
    binary = skip_whitespace(binary)

    cond do
      binary == "" ->
        :incomplete

      String.starts_with?(binary, "{") ->
        {:ok, :begin_object, String.slice(binary, 1..-1//1)}

      String.starts_with?(binary, "}") ->
        {:ok, :end_object, String.slice(binary, 1..-1//1)}

      String.starts_with?(binary, "[") ->
        {:ok, :begin_array, String.slice(binary, 1..-1//1)}

      String.starts_with?(binary, "]") ->
        {:ok, :end_array, String.slice(binary, 1..-1//1)}

      String.starts_with?(binary, ":") ->
        {:ok, :colon, String.slice(binary, 1..-1//1)}

      String.starts_with?(binary, ",") ->
        {:ok, :comma, String.slice(binary, 1..-1//1)}

      String.starts_with?(binary, "\"") ->
        # Process the string after the opening quote.
        parse_string(String.slice(binary, 1..-1//1), "")

      Regex.match?(~r/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, binary) ->
        [num_str] = Regex.run(~r/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, binary)
        rest = String.slice(binary, byte_size(num_str), byte_size(binary) - byte_size(num_str))
        {number, _} = Float.parse(num_str)
        {:ok, {:number, number}, rest}

      String.starts_with?(binary, "true") ->
        {:ok, {:boolean, true}, String.slice(binary, 4..-1//1)}

      String.starts_with?(binary, "false") ->
        {:ok, {:boolean, false}, String.slice(binary, 5..-1//1)}

      String.starts_with?(binary, "null") ->
        {:ok, {:null, nil}, String.slice(binary, 4..-1//1)}

      true ->
        :incomplete
    end
  end

  # Expose a helper to continue parsing a string given an accumulator.
  @doc """
  Continues parsing a JSON string given the current accumulator.

  Returns {:ok, token, rest}, where token is either:
    - {:string, value} if a closing quote is found.
    - {:partial_string, value} if no closing quote is found.
  In this version, if no closing quote is found the entire input is consumed.
  """
  def continue_string(binary, acc) when is_binary(binary) and is_binary(acc) do
    binary = skip_whitespace(binary)

    if String.contains?(binary, "\"") do
      parse_string_complete(binary, acc)
    else
      # Consume all available input and return a partial token.
      {:ok, {:partial_string, acc <> binary}, ""}
    end
  end

  # -- Private functions --

  defp skip_whitespace(<<c, rest::binary>>) when c in [?\s, ?\n, ?\r, ?\t],
    do: skip_whitespace(rest)

  defp skip_whitespace(binary), do: binary

  # parse_string/2: if a closing quote exists in the binary, delegate to complete parsing;
  # otherwise, consume all input and return a partial token.
  defp parse_string(binary, acc) do
    if String.contains?(binary, "\"") do
      parse_string_complete(binary, acc)
    else
      {:ok, {:partial_string, acc <> binary}, ""}
    end
  end

  defp parse_string_complete(<<"\"", rest::binary>>, acc),
    do: {:ok, {:string, acc}, rest}

  defp parse_string_complete(<<"\\", rest::binary>>, acc) do
    case rest do
      <<>> ->
        {:ok, {:partial_string, acc}, ""}

      <<esc, tail::binary>> ->
        case parse_escape(esc, tail) do
          {:ok, char, rest_after} ->
            parse_string_complete(rest_after, acc <> char)

          :incomplete ->
            {:ok, {:partial_string, acc}, ""}
        end
    end
  end

  defp parse_string_complete(<<char::utf8, rest::binary>>, acc),
    do: parse_string_complete(rest, acc <> <<char::utf8>>)

  defp parse_escape(?", tail), do: {:ok, "\"", tail}
  defp parse_escape(?\\, tail), do: {:ok, "\\", tail}
  defp parse_escape(?/, tail), do: {:ok, "/", tail}
  defp parse_escape(?b, tail), do: {:ok, <<8>>, tail}
  defp parse_escape(?f, tail), do: {:ok, <<12>>, tail}
  defp parse_escape(?n, tail), do: {:ok, "\n", tail}
  defp parse_escape(?r, tail), do: {:ok, "\r", tail}
  defp parse_escape(?t, tail), do: {:ok, "\t", tail}

  defp parse_escape(?u, tail) do
    if byte_size(tail) < 4 do
      :incomplete
    else
      <<hex::binary-size(4), rest::binary>> = tail

      case Integer.parse(hex, 16) do
        {codepoint, ""} ->
          {:ok, <<codepoint::utf8>>, rest}

        _ ->
          :incomplete
      end
    end
  end

  defp parse_escape(_, _tail), do: :incomplete
end
