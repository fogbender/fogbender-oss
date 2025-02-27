defmodule Fog.Api.Tag do
  use Fog.Api.Handler
  alias Fog.Repo
  alias Fog.Api.{Event, Perm}

  defmsg(Create, [
    :workspaceId,
    :tag
  ])

  defmsg(Update, [
    :workspaceId,
    :tag,
    :newTag
  ])

  defmsg(Delete, [
    :workspaceId,
    :tag
  ])

  defmsg(Ok, [])
  deferr(Err, [])

  @commands [Create, Update, Delete]

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    if auth(m, s) do
      handle(m, s)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  def auth(%Create{workspaceId: wid, tag: tag}, s) do
    Perm.Tag.allowed?(s, :create, workspace_id: wid, tag: tag)
  end

  def auth(%Update{workspaceId: wid, tag: tag, newTag: new_tag}, s) do
    Perm.Tag.allowed?(s, :update, workspace_id: wid, tag: tag, new_tag: new_tag)
  end

  def auth(%Delete{workspaceId: wid, tag: tag}, s) do
    Perm.Tag.allowed?(s, :delete, workspace_id: wid, tag: tag)
  end

  def auth(_, _), do: false

  def handle(%Create{workspaceId: wid, tag: tag}, _s) do
    Repo.Tag.create(wid, tag)
    {:reply, %Ok{}}
  end

  def handle(%Update{workspaceId: wid, tag: tag, newTag: new_tag}, _s) do
    :ok = Repo.Tag.update(wid, tag, new_tag)

    Repo.Tag.get_tagged(wid, new_tag)
    |> Event.publish_all()

    {:reply, %Ok{}}
  end

  def handle(%Delete{workspaceId: wid, tag: tag}, _s) do
    entities = Repo.Tag.get_tagged(wid, tag)
    :ok = Repo.Tag.delete(wid, tag)
    Event.publish_all(entities)
    {:reply, %Ok{}}
  end
end
