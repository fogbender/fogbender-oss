defmodule Fog.Json.StreamingParser do
  @doc "Creates a new parser state."
  def new do
    %{
      buffer: "",
      stack: [],
      pending_key: nil,
      current_path: [],
      results: %{},
      open_string: nil,
      # At the root, we expect a value; inside an object, mode switches to :key.
      mode: :value
    }
  end

  @doc "Adds a new JSON chunk to the parser state."
  def add_chunk(state, chunk) do
    buf = state.buffer <> chunk
    {state, buf} = process_open_string(buf, state)
    process_tokens(buf, state)
  end

  @doc "Returns the current result for the given JSON path."
  def path(state, path), do: Map.get(state.results, path, :not_processed)

  # Process tokens until no complete token is left.
  defp process_tokens(buffer, state) do
    case Fog.Json.Tokenizer.next_token(buffer) do
      :incomplete ->
        %{state | buffer: buffer}

      {:ok, token, rest} ->
        state = update_state(token, state)
        process_tokens(rest, state)
    end
  end

  # If a string is in progress, continue it.
  defp process_open_string(buffer, state) do
    case state.open_string do
      nil ->
        {state, buffer}

      {path, acc} ->
        case continue_string_preserve(buffer, acc) do
          {:ok, {:string, value}, rest} ->
            if state.mode == :value and state.pending_key do
              new_state = update_result(state, path, {:ok, value})
              {Map.put(new_state, :open_string, nil), rest}
            else
              {state |> Map.put(:open_string, nil) |> Map.put(:pending_key, value), rest}
            end

          {:ok, {:partial_string, value}, _rest} ->
            if state.mode == :value and state.pending_key do
              new_state = update_result(state, path, {:partial, value})
              {Map.put(new_state, :open_string, {path, value}), ""}
            else
              {state |> Map.put(:open_string, {nil, value}) |> Map.put(:pending_key, value), ""}
            end

          :incomplete ->
            {state, buffer}
        end
    end
  end

  # Custom continuation that does not skip whitespace.
  defp continue_string_preserve(binary, acc) when is_binary(binary) and is_binary(acc) do
    if String.contains?(binary, "\"") do
      parse_string_complete_preserve(binary, acc)
    else
      {:ok, {:partial_string, acc <> binary}, ""}
    end
  end

  defp parse_string_complete_preserve("", acc),
    do: {:ok, {:partial_string, acc}, ""}

  # Parses a string without calling skip_whitespace.
  defp parse_string_complete_preserve(<<"\"", rest::binary>>, acc),
    do: {:ok, {:string, acc}, rest}

  defp parse_string_complete_preserve(<<"\\", rest::binary>>, acc) do
    case rest do
      <<>> ->
        {:ok, {:partial_string, acc}, ""}

      <<esc, tail::binary>> ->
        case parse_escape(esc, tail) do
          {:ok, char, rest_after} ->
            parse_string_complete_preserve(rest_after, acc <> char)

          :incomplete ->
            {:ok, {:partial_string, acc}, ""}
        end
    end
  end

  defp parse_string_complete_preserve(<<char::utf8, rest::binary>>, acc),
    do: parse_string_complete_preserve(rest, acc <> <<char::utf8>>)

  # Escape helpers (copied from your tokenizer)
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

  defp update_result(state, path, res) do
    %{state | results: Map.put(state.results, path, res)}
  end

  # Update parser state based on the token.
  defp update_state(token, state) do
    case token do
      :begin_object ->
        if state.pending_key do
          new_path = state.current_path ++ [state.pending_key]
          new_stack = [{state.mode, state.pending_key, state.current_path} | state.stack]
          %{state | current_path: new_path, mode: :key, pending_key: nil, stack: new_stack}
        else
          new_stack = [{state.mode, state.pending_key, state.current_path} | state.stack]
          %{state | mode: :key, pending_key: nil, stack: new_stack}
        end

      :end_object ->
        case state.stack do
          [{prev_mode, prev_pending, prev_path} | rest] ->
            %{
              state
              | mode: prev_mode,
                pending_key: prev_pending,
                current_path: prev_path,
                stack: rest
            }

          [] ->
            state
        end

      :begin_array ->
        if state.pending_key do
          new_path = state.current_path ++ [state.pending_key]
          new_stack = [{state.mode, state.pending_key, state.current_path} | state.stack]
          %{state | current_path: new_path, mode: :value, pending_key: nil, stack: new_stack}
        else
          new_stack = [{state.mode, state.pending_key, state.current_path} | state.stack]
          %{state | mode: :value, pending_key: nil, stack: new_stack}
        end

      :end_array ->
        case state.stack do
          [{prev_mode, prev_pending, prev_path} | rest] ->
            %{
              state
              | mode: prev_mode,
                pending_key: prev_pending,
                current_path: prev_path,
                stack: rest
            }

          [] ->
            state
        end

      :colon ->
        %{state | mode: :value}

      :comma ->
        %{state | mode: :key, pending_key: nil}

      {:string, value} ->
        cond do
          state.mode == :key ->
            %{state | pending_key: value, open_string: nil}

          state.mode == :value and state.pending_key ->
            path = state.current_path ++ [state.pending_key]
            new_state = update_result(state, path, {:ok, value})
            %{new_state | pending_key: nil, open_string: nil}

          true ->
            state
        end

      {:partial_string, value} ->
        cond do
          state.mode == :key ->
            %{state | pending_key: value, open_string: {nil, value}}

          state.mode == :value and state.pending_key ->
            path = state.current_path ++ [state.pending_key]
            new_state = update_result(state, path, {:partial, value})
            %{new_state | open_string: {path, value}}

          true ->
            state
        end

      {:number, _} = token ->
        if state.mode == :value and state.pending_key do
          path = state.current_path ++ [state.pending_key]
          update_result(%{state | pending_key: nil, open_string: nil}, path, token)
        else
          state
        end

      {:boolean, _} = token ->
        if state.mode == :value and state.pending_key do
          path = state.current_path ++ [state.pending_key]
          update_result(%{state | pending_key: nil, open_string: nil}, path, token)
        else
          state
        end

      {:null, _} = token ->
        if state.mode == :value and state.pending_key do
          path = state.current_path ++ [state.pending_key]
          update_result(%{state | pending_key: nil, open_string: nil}, path, token)
        else
          state
        end

      _ ->
        state
    end
  end
end
