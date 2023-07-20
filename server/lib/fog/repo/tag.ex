defmodule Fog.Repo.Tag do
  alias Fog.{Data, Repo}

  import Ecto.Query

  def get(id), do: Data.Tag |> Repo.get(id)

  def create(wid, name) do
    tag = Data.Tag |> Repo.get_by(workspace_id: wid, name: name)

    if is_nil(tag) do
      %Data.Tag{} =
        Fog.Data.Tag.new(%{
          name: name,
          workspace_id: wid
        })
        |> Repo.insert!(
          on_conflict: :nothing,
          conflict_target: [:name, :workspace_id]
        )

      Data.Tag |> Repo.get_by(workspace_id: wid, name: name)
    else
      tag
    end
  end

  def delete(wid, name) do
    Repo.transaction(fn ->
      t =
        from(t in Data.Tag,
          where: t.workspace_id == ^wid and t.name == ^name
        )
        |> Repo.one!()

      from(rt in Data.RoomTag,
        where: rt.tag_id == ^t.id
      )
      |> Repo.delete_all()

      Repo.delete!(t)
    end)

    :ok
  end

  def update(wid, name, new_name) do
    Repo.transaction(fn ->
      from(t in Data.Tag,
        where: t.workspace_id == ^wid and t.name == ^name
      )
      |> Repo.one!()
      |> Data.Tag.update(name: new_name)
      |> Repo.update!()
    end)

    :ok
  end

  def get_tagged(workspace_id, tag) do
    from(w in Data.Workspace,
      join: r in assoc(w, :rooms),
      join: rt in assoc(r, :tags),
      join: t in assoc(rt, :tag),
      where: t.name == ^tag,
      where: w.id == ^workspace_id,
      select: r
    )
    |> Repo.all()
  end

  def parse(":" <> tag) do
    case String.split(tag, ":") do
      ["@" <> actor_id | options] -> {:personal, actor_id, options}
      [prefix | options] -> {:system, prefix, options}
    end
  end

  def parse("#" <> tag), do: {:public, tag, []}
  # TODO Remove on TeamedUp close
  def parse(tag), do: {:public, tag, []}

  def with_user(q \\ Data.AuthorTag, user_id) do
    where(q, [t], t.user_id == ^user_id)
  end
end
