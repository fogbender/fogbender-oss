defmodule Fog.Api do
  require Logger
  alias Fog.Api
  alias Fog.Api.{Error, Session}

  defstruct [:session, :handlers, :encoders]

  @handlers [
    Api.Author,
    Api.Ping,
    Api.Echo,
    Api.Auth,
    Api.Room,
    Api.Message,
    Api.File,
    Api.Typing,
    Api.Roster,
    Api.Stream,
    Api.Search,
    Api.Integration,
    Api.User,
    Api.Tag,
    Api.NotifyDelay,
    Api.Event,
    Api.Ai
  ]

  @encoders [
    json: Api.Encoder.Json,
    bson: Api.Encoder.Bson
  ]

  @type state :: %Api{}
  @type session :: Session.t()
  @type message :: struct
  @type response :: message | [message]
  @type encoded :: binary
  @type encoded_response :: response | encoded | [encoded]
  @type format :: atom
  @type handlers :: [handler]
  @type handler :: atom
  @type encoders :: Keyword.t()

  @spec init() :: state
  def init() do
    init(Session.guest())
  end

  @spec init(session, handlers, encoders) :: state
  def init(session, handlers \\ @handlers, encoders \\ @encoders) do
    %Api{session: session, handlers: handlers, encoders: encoders}
  end

  @spec request(message, state) :: {:ok, state} | {:reply, response, state}
  def request(message, state), do: request(:raw, :raw, message, state)

  @spec request(format, format, encoded, state) ::
          {:ok, state} | {:reply, encoded_response, state}
  def request(iformat, oformat, encoded, state),
    do: decode_run_encode(iformat, oformat, encoded, false, state)

  @spec info(message, state) :: {:ok, state} | {:reply, response, state}
  def info(message, state), do: info(:raw, :raw, message, state)

  @spec info(format, format, message, state) :: {:ok, state} | {:reply, response, state}
  def info(iformat, oformat, message, state),
    do: decode_run_encode(iformat, oformat, message, true, state)

  defp decode_run_encode(iformat, oformat, encoded, allow_unknown, state) do
    case decode(iformat, encoded, state) do
      {:ok, %Error.InvalidMsgType{} = message} ->
        Logger.error("Invalid request type: #{message.msgType}")
        error = Error.Fatal.invalid_request(error: "Invalid request type: #{message.msgType}")

        {:reply, error, state}
        |> set_reply_msg_id(message)
        |> encode_reply(oformat)

      {:ok, message} ->
        run(message, state)
        |> update_unknown(allow_unknown)
        |> set_reply_msg_id(message)
        |> encode_reply(oformat)

      {:error, :invalid_format} ->
        error = Error.Fatal.invalid_request(error: "Invalid request format")

        {:reply, error, state}
        |> encode_reply(oformat)
    end
  end

  defp run(message, %Api{handlers: handlers, session: session} = state) do
    case run_handlers(message, handlers, session) do
      {:ok, new_session} -> {:ok, %Api{state | session: new_session}}
      {:reply, message, new_session} -> {:reply, message, %Api{state | session: new_session}}
      :unknown -> {:unknown, state}
    end
  rescue
    err in Ecto.InvalidChangesetError ->
      errors = changeset_errors_to_map(err.changeset)
      Logger.error("DB conflict processing #{inspect(message)}:\n" <> inspect(errors))
      {:reply, Error.Fatal.conflict(data: errors), state}

    err ->
      Logger.error(
        "Handler exception processing #{inspect(message)}:\n" <>
          Exception.format(:error, err, __STACKTRACE__)
      )

      {:reply, Error.Fatal.internal(), state}
  catch
    :throw, {:reply, message} ->
      {:reply, message, state}
  end

  defp run_handlers(message, [], _session) do
    Logger.warn("Unknown API message: #{inspect(message)}")
    :unknown
  end

  defp run_handlers(message, [h | t], session) do
    case h.info(message, session) do
      {:ok, session} -> {:ok, session}
      {:reply, reply} -> {:reply, reply, session}
      {:reply, reply, session} -> {:reply, reply, session}
      :skip -> run_handlers(message, t, session)
    end
  end

  defp decode(:raw, message, _), do: {:ok, message}

  defp decode(format, encoded, %Api{encoders: encoders}) do
    case encoders[format] do
      nil ->
        Logger.error("Unknown decoding format: #{format}")
        {:error, :invalid_format}

      mod ->
        mod.decode(encoded)
    end
  rescue
    err ->
      Logger.error(Exception.format(:error, err, __STACKTRACE__))
      {:error, :invalid_format}
  end

  defp encode_reply(reply, :raw), do: reply

  defp encode_reply({:reply, reply, %Api{encoders: encoders} = state}, format) do
    case encoders[format] do
      nil ->
        Logger.error("Unknown encoding format: #{format}")
        {:ok, state}

      mod ->
        {:reply, encode(mod, reply), state}
    end
  rescue
    err ->
      Logger.error(Exception.format(:error, err, __STACKTRACE__))
      {:ok, state}
  end

  defp encode_reply(reply, _), do: reply

  defp encode(mod, reply) when is_list(reply), do: Enum.map(reply, &mod.encode(&1))
  defp encode(mod, reply), do: mod.encode(reply)

  defp update_unknown({:unknown, state}, allow_unknown) do
    if allow_unknown do
      {:ok, state}
    else
      {:reply, Error.Fatal.invalid_request(error: "Unknown request"), state}
    end
  end

  defp update_unknown(result, _), do: result

  defp set_reply_msg_id({:reply, reply, state}, %{msgId: msg_id}) when is_list(reply),
    do: {:reply, Enum.map(reply, &set_msg_id(&1, msg_id)), state}

  defp set_reply_msg_id({:reply, reply, state}, %{msgId: msg_id}),
    do: {:reply, set_msg_id(reply, msg_id), state}

  defp set_reply_msg_id(reply, _), do: reply

  defp set_msg_id(%{msgId: nil} = reply, msg_id), do: %{reply | msgId: msg_id}

  defp set_msg_id(reply, _), do: reply

  defp changeset_errors_to_map(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
