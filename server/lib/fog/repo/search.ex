defmodule Fog.Repo.Search do
  import Ecto.Query

  alias Fog.{Repo, Data, Repo.Fts}
  require Fog.Repo.Fts

  @messages_limit 30

  def room_messages(%{room_id: room_id, term: term} = params) do
    Data.Message
    |> where([m], m.room_id == ^room_id)
    |> where([m], Fts.is_similar(m.text, ^term))
    |> order_by(^[desc: Fts.relevance([m], m.text, term)])
    |> order_by(desc: :inserted_at)
    |> limit(^Map.get(params, :limit, @messages_limit))
    |> Repo.all()
  end
end
