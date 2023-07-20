defmodule Fog.Notify.Badge do
  alias Fog.{Api.Event, Data}

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(from_event) do
    if Fog.env(:notify_badge_enable) do
      {:ok, _} =
        Task.Supervisor.start_child(
          __MODULE__,
          __MODULE__,
          :run,
          [from_event]
        )

      :ok
    else
      run(from_event)
    end
  end

  def run(%Fog.Api.Event.Message{} = message) do
    Fog.Api.Event.Badge.load_all(message)
    |> Enum.map(fn badge ->
      :ok = send_notification(badge, message)
      :ok = Fog.Api.Event.publish(badge)
    end)

    :ok
  end

  def run(%Fog.Api.Event.Room{} = room) do
    Fog.Api.Event.Badge.load_all(room)
    |> Enum.map(fn badge ->
      :ok = Fog.Api.Event.publish(badge)
    end)

    :ok
  end

  defp send_notification(%Data.Badge{} = badge, %Event.Message{} = message) do
    cond do
      badge.count === 0 and not is_mentioned(author(badge), message.mentions) ->
        :ok

      badge.first_unread_message_id > message.id ->
        :ok

      badge.following === 0 and not is_mentioned(author(badge), message.mentions) ->
        :ok

      true ->
        Fog.Api.Event.Notification.Message.publish(message, [author(badge)])
        :ok
    end
  end

  defp author(%Data.Badge{agent_id: nil, user_id: user_id}), do: user_id
  defp author(%Data.Badge{agent_id: agent_id, user_id: nil}), do: agent_id

  defp is_mentioned(_, []), do: false
  defp is_mentioned(id, [%{id: id} | _]), do: true
  defp is_mentioned(id, [_ | rest]), do: is_mentioned(id, rest)
end
