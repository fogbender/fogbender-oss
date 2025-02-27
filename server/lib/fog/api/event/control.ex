defmodule Fog.Api.Event.Control do
  alias Fog.Api.Event.Control

  use Fog.StructAccess

  alias Fog.{PubSub}

  defstruct [
    :msgType,
    :msgId,
    :command
  ]

  def publish(:reload, ctx) do
    for t <- topics(ctx), do: PubSub.publish(t, %Control{command: "reload"})
    :ok
  end

  defp topics(%{workspace_id: workspace_id}) do
    [
      "workspace/#{workspace_id}/control"
    ]
  end

  defp topics(%{helpdesk_id: helpdesk_id}) do
    [
      "helpdesk/#{helpdesk_id}/control"
    ]
  end
end
