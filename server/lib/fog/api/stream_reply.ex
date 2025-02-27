defmodule Fog.Api.StreamReply do
  use Fog.Api.Handler
  alias Fog.Api.{Perm}

  require Logger

  defmsg(Cancel, [:messageId])

  @commands [Cancel]

  defmsg(Ok, [])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    if auth(m, s) do
      :ok = handle_command(m, s)
      {:reply, %Ok{}}
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp auth(%Cancel{messageId: id}, sess) do
    Perm.Message.allowed?(sess, :read, message_id: id)
  end

  defp handle_command(%Cancel{messageId: message_id}, _sess) do
    %Fog.Data.Message{room_id: room_id} = Fog.Repo.Message.get(message_id)

    case Fog.Llm.RoomSupervisor.find_run_server(room_id: room_id, message_id: message_id) do
      {:ok, pid} ->
        :ok = Fog.Llm.RunServer.cancel(pid)

      nil ->
        Logger.error("Run server for #{room_id}, #{message_id} not found")
        :ok
    end
  end
end
