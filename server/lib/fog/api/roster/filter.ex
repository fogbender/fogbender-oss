defmodule Fog.Api.Roster.Filter do
  alias Fog.Api.{Event, Session}

  @type t() :: (%Event.RosterRoom{} -> boolean())

  @filters [
    "customerIds",
    "focused",
    "maxNewVisitorAge"
  ]

  @max_visitor_age 30

  def valid?(nil), do: true
  def valid?(filter), do: Map.keys(filter) -- @filters == []

  def new(nil, session) do
    filter = p_new_visitor_age(session, nil)
    {:ok, filter}
  end

  def new(cfg, session) do
    case Map.keys(cfg) -- @filters do
      [] ->
        filter =
          p_and([
            p_customers(cfg["customerIds"]),
            p_focused(cfg["focused"]),
            p_new_visitor_age(session, cfg["maxNewVisitorAge"])
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
      [] -> p_true()
      [pred] -> pred
      preds when is_list(preds) -> fn e -> Enum.all?(preds, & &1.(e)) end
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

  defp p_new_visitor_age(_sess, 0), do: p_true()
  defp p_new_visitor_age(sess, nil), do: p_new_visitor_age(sess, @max_visitor_age)

  defp p_new_visitor_age(%Session.Agent{}, max_age) do
    fn
      %Event.RosterRoom{room: %Event.Room{} = r, badge: nil} ->
        is_new_visitor = not r.resolved and r.type == "private" and r.customerType == "visitor"
        not is_new_visitor or Fog.Utils.time_diff(r.createdTs, :minute) < max_age

      _ ->
        true
    end
  end

  defp p_new_visitor_age(_, _), do: p_true()

  defp p_const(value), do: fn _ -> value end
  defp p_true(), do: p_const(true)

  defp active_badge?(%Event.Badge{} = b) do
    b.count > 0 or b.mentionsCount > 0
  end

  defp active_badge?(nil), do: false
end
