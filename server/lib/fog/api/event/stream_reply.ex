defmodule Fog.Api.Event.StreamReply do
  alias Fog.Api.Event.StreamReply

  use Fog.StructAccess

  alias Fog.{PubSub}

  defstruct [
    :msgType,
    :msgId,
    :roomId,
    :messageId,
    :text
  ]

  def publish(e) do
    for t <- topics(e), do: PubSub.publish(t, e)
    :ok
  end

  defp topics(%StreamReply{roomId: room_id}) do
    [
      "room/#{room_id}/stream-reply"
    ]
  end
end
