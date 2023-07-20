defmodule Fog.Api.NotifyDelay do
  require Logger
  use Fog.Api.Handler
  alias Fog.Api.Event
  alias Event.Notification.Message, as: ENM
  @delay 5000

  def info(%ENM{} = e, %{pending_notifications: pns} = s) do
    pns = add_pending(e, pns)
    {:ok, %{s | pending_notifications: pns}}
  end

  def info(%Event.Seen{roomId: rid, messageId: mid}, %{pending_notifications: pns} = s) do
    pns = remove_seen(rid, mid, pns)
    {:ok, %{s | pending_notifications: pns}}
  end

  def info({:notify, mid}, %{pending_notifications: pns} = s) do
    case Map.pop(pns, mid) do
      {nil, pns} ->
        {:ok, %{s | pending_notifications: pns}}

      {{t, e}, pns} ->
        Process.cancel_timer(t)
        {:reply, e, %{s | pending_notifications: pns}}
    end
  end

  def info(_, _), do: :skip

  defp start_timer(mid) do
    Process.send_after(self(), {:notify, mid}, @delay)
  end

  defp add_pending(%ENM{id: event_mid} = e, pns) do
    t = start_timer(event_mid)
    Map.put(pns, event_mid, {t, e})
  end

  defp remove_seen(rid, seen_mid, pns) do
    handler = fn
      {event_mid, {ref, %ENM{roomId: ^rid}}}, acc when event_mid <= seen_mid ->
        Process.cancel_timer(ref)
        acc

      {event_mid, pn}, acc ->
        Map.put(acc, event_mid, pn)
    end

    Enum.reduce(pns, %{}, handler)
  end
end
