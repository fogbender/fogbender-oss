defmodule Fog.Api.Event.Tag do
  alias Fog.{Repo, Data, PubSub, Utils}
  alias Fog.Repo.Query
  alias Fog.Api.Event.Tag

  defstruct [
    :msgType,
    :msgId,
    :id,
    :name,
    :remove,
    :updatedTs,
    :createdTs
  ]

  def load_inserted(ctx, opts, _sess) do
    Data.AuthorTag
    |> Query.with_ctx(ctx)
    |> Query.inserted(opts)
    |> Repo.all()
    |> Repo.preload(:tag)
    |> Enum.map(&from_data/1)
  end

  def publish(%Data.AuthorTag{} = t, opts \\ %{}) do
    t = Repo.preload(t, :tag)
    e = from_data(t, opts)
    for t <- topics(t), do: PubSub.publish(t, e)
    :ok
  end

  defp topics(%Data.AuthorTag{user_id: user_id}) do
    [
      "user/#{user_id}/tags"
    ]
  end

  defp from_data(%Data.AuthorTag{} = t, opts \\ %{}) do
    r = %Tag{
      id: t.tag.id,
      name: t.tag.name,
      updatedTs: t.tag.updated_at |> Utils.to_unix(),
      createdTs: t.tag.inserted_at |> Utils.to_unix()
    }

    if Map.has_key?(opts, :remove) and opts.remove == true do
      Map.merge(r, %{remove: true})
    else
      r
    end
  end
end
