defmodule Fog.Api.Llm do
  use Fog.Api.Handler

  alias Fog.Api.{Message}
  alias Fog.Repo

  def info(c, s), do: info(c, s, [])

  def info(%Message.Create{} = cmd, sess, pipeline) do
    messageOk =
      Enum.find(pipeline, fn
        {:reply, %Message.Ok{}, _} ->
          true

        _ ->
          # Message.Create failed
          false
      end)

    case messageOk do
      {_, %Message.Ok{messageId: messageId}, _} ->
        message = Repo.Message.get(messageId)

        if Code.ensure_loaded?(Mix) and function_exported?(Mix, :env, 0) and
             Mix.env() == :test do
          # XXX need to find a way to give DB connections access in test mode
          :ok
        else
          :ok = Fog.Llm.RoomServer.schedule(cmd: cmd, message: message, sess: sess)
        end

        :skip

      _ ->
        :skip
    end
  end

  def info(_, _, _), do: :skip
end
