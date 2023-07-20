defmodule Fog.Api.Event.Notification.Message do
  alias Fog.{PubSub}
  alias Fog.Api.Event

  defstruct [
    :msgType,
    :msgId,
    :id,
    :clientId,
    :vendorId,
    :workspaceId,
    :helpdeskId,
    :customerId,
    :fromType,
    :fromId,
    :fromName,
    :fromAvatarUrl,
    :roomId,
    :updatedTs,
    :createdTs,
    :text,
    :plainText
  ]

  def load_inserted(_, _, _), do: []
  def load_updated(_, _, _), do: []

  def publish(%Event.Message{} = m, ids) do
    e = from_message(m)
    for id <- ids, do: PubSub.publish(topic(id), e)
    :ok
  end

  defp topic("a" <> _ = id), do: "agent/#{id}/notifications"
  defp topic("u" <> _ = id), do: "user/#{id}/notifications"

  defp from_message(%Event.Message{} = m) do
    %Event.Notification.Message{
      id: m.id,
      clientId: m.clientId,
      vendorId: m.vendorId,
      workspaceId: m.workspaceId,
      helpdeskId: m.helpdeskId,
      customerId: m.customerId,
      fromType: m.fromType,
      fromId: m.fromId,
      fromName: m.fromName,
      fromAvatarUrl: m.fromAvatarUrl,
      roomId: m.roomId,
      createdTs: m.createdTs,
      text: m.text,
      plainText: m.plainText
    }
  end
end
