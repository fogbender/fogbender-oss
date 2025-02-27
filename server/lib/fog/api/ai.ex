defmodule Fog.Api.Ai do
  use Fog.Api.Handler
  alias Fog.Api.{Perm}
  alias Fog.{Ai, Repo, Utils}

  require Logger

  defmsg(Summarize, [
    :roomId,
    :startMessageId,
    :endMessageId,
    :maxWords
  ])

  defmsg(Suggest, [
    :roomId,
    :startMessageId,
    :endMessageId
  ])

  @commands [Summarize, Suggest]

  defmsg(Ok, [:response])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    if auth(m, s) do
      case handle_command(m, s) do
        {:error, error} ->
          {:reply, Err.invalid_request([error])}

        :ok ->
          {:reply, %Ok{}}

        responses ->
          {:reply, %Ok{response: responses}}
      end
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp auth(%Summarize{roomId: room_id}, sess),
    do: Perm.Room.allowed?(sess, :read, room_id: room_id)

  defp auth(%Suggest{roomId: room_id}, sess),
    do: Perm.Room.allowed?(sess, :read, room_id: room_id)

  defp handle_command(
         %Summarize{
           roomId: room_id,
           startMessageId: start_message_id,
           endMessageId: end_message_id
         } = cmd,
         _sess
       ) do
    maxWords = Map.get(cmd, :maxWords) || 8

    text =
      Repo.Room.messages_slice(room_id, start_message_id, end_message_id)
      |> Enum.map(fn m ->
        m.text
      end)
      |> Enum.join("\n\n")

    Utils.text_to_issue_title(text, maxWords)
  end

  defp handle_command(
         %Suggest{
           roomId: room_id
         } = cmd,
         sess
       ) do
    room = Repo.Room.get(room_id)
    :ok = Ai.EventTask.schedule(cmd: cmd, room: room, sess: sess)
  end
end
