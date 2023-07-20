defmodule Fog.Api.Roster.Filter do
  alias Fog.Api.Event

  @type t() :: (%Event.RosterRoom{} -> boolean())

  @filters [
    "customerIds",
    "focused"
  ]

  def new(nil, _session), do: {:ok, p_empty()}

  def new(cfg, _session) do
    case Map.keys(cfg) -- @filters do
      [] ->
        filter =
          p_and([
            p_customers(cfg["customerIds"]),
            p_focused(cfg["focused"])
          ])

        {:ok, filter}

      rest ->
        {:error, "Invalid filters: #{inspect(rest)}"}
    end
  end

  def from_event(event, filter) do
    filter.(event)
  end

  defp p_and(preds) do
    case List.flatten(preds) do
      [] -> p_empty()
      [pred] -> pred
      preds -> fn e -> Enum.all?(preds, & &1.(e)) end
    end
  end

  defp p_customers(ids) when is_list(ids) and ids != [] do
    fn %Event.RosterRoom{room: r} -> r.customerId in ids end
  end

  defp p_customers(_), do: []

  defp p_focused(true) do
    fn %Event.RosterRoom{room: r, badge: b} ->
      r.status == "active" and
        (not r.resolved or active_badge?(b))
    end
  end

  defp p_focused(_), do: []

  defp p_empty() do
    fn _ -> true end
  end

  defp active_badge?(%Event.Badge{} = b) do
    b.count > 0 or b.mentionsCount > 0
  end

  defp active_badge?(nil), do: false
end
