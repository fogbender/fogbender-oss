defmodule Fog.Repo.Search do
  import Ecto.Query

  alias Fog.{Repo, Data, Repo.Fts}
  require Fog.Repo.Fts

  @messages_limit 30

  def room_messages(%{room_id: room_id, term: term} = params) do
    from(m in Data.Message,
      as: :message,
      left_lateral_join: s in ^forwarded_source(term),
      where: m.room_id == ^room_id,
      where: not is_nil(s.rel) or Fts.is_similar(m.text, ^term),
      order_by: ^[desc: dynamic([m, s], coalesce(s.rel, ^Fts.relevance([m], m.text, term)))],
      order_by: [desc: :inserted_at],
      limit: ^Map.get(params, :limit, @messages_limit)
    )
    |> Repo.all()
  end

  defp forwarded_source(term) do
    from(l in Data.MessageLink,
      join: s in assoc(l, :source_message),
      where: l.target_message_id == parent_as(:message).id,
      where: Fts.is_similar(s.text, ^term),
      select: ^%{rel: Fts.relevance([l, s], s.text, term)}
    )
    |> subquery()
    |> select([s], %{rel: max(s.rel)})
    |> subquery()
  end
end
