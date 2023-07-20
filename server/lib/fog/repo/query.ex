defmodule Fog.Repo.Query do
  import Ecto.Query
  alias Fog.{Data, Utils}
  @limit 5

  def updated(query, %{since: since} = opts) when is_integer(since) do
    query
    |> where([q], q.updated_at > ^Utils.from_unix(since))
    |> order_by(asc: :updated_at)
    |> set_limit(opts)
  end

  def updated(query, %{before: before} = opts) when is_integer(before) do
    from(q in query, where: q.updated_at < ^Utils.from_unix(before))
    |> order_by(desc: :updated_at)
    |> set_limit(opts)
  end

  def updated(query, opts) do
    query
    |> order_by(desc: :updated_at)
    |> set_limit(opts)
  end

  def inserted(query, %{startId: start_id, endId: end_id} = opts)
      when is_binary(start_id) and is_binary(end_id) do
    from(q in query, where: q.id >= ^start_id and q.id <= ^end_id)
    |> order_by(desc: :inserted_at)
    |> set_limit(opts)
  end

  def inserted(query, %{since: since} = opts) when is_integer(since) do
    from(q in query, where: q.inserted_at > ^Utils.from_unix(since))
    |> order_by(asc: :inserted_at)
    |> set_limit(opts)
  end

  def inserted(query, %{before: before} = opts) when is_integer(before) do
    from(q in query, where: q.inserted_at < ^Utils.from_unix(before))
    |> order_by(desc: :inserted_at)
    |> set_limit(opts)
  end

  def inserted(query, opts) do
    query
    |> order_by(desc: :inserted_at)
    |> set_limit(opts)
  end

  def aroundBefore(query, %{aroundId: aroundId} = _opts) when is_binary(aroundId) do
    from(q in query, where: q.id <= ^aroundId, order_by: [desc: q.id], limit: 5)
  end

  def aroundAfter(query, %{aroundId: aroundId} = _opts) when is_binary(aroundId) do
    from(q in query, where: q.id > ^aroundId, order_by: [asc: q.id], limit: 5)
  end

  def with_ctx(query, %Data.Vendor{id: id}) do
    case :vendors in query.__schema__(:associations) do
      true ->
        from(q in query, join: c in assoc(q, :vendors), where: c.vendor_id == ^id)

      false ->
        from(q in query, join: c in assoc(q, :vendor), where: c.id == ^id)
    end
  end

  def with_ctx(query, %Data.Workspace{id: id}) do
    from(q in query, join: c in assoc(q, :workspace), on: c.id == ^id)
  end

  def with_ctx(query, %Data.Helpdesk{id: id}) do
    from(q in query, join: c in assoc(q, :helpdesk), on: c.id == ^id)
  end

  def with_ctx(query, %Data.Room{id: id}) do
    from(q in query, join: c in assoc(q, :room), on: c.id == ^id)
  end

  def with_ctx(query, %Data.Agent{id: id}) do
    from(q in query, join: c in assoc(q, :agent), on: c.id == ^id)
  end

  def with_ctx(query, %Data.User{id: id}) do
    from(q in query, join: c in assoc(q, :user), on: c.id == ^id)
  end

  def set_limit(query, %{limit: 0}), do: query

  def set_limit(query, %{limit: limit}) when is_integer(limit) and limit > 0 and limit <= 1000,
    do: from(q in query, limit: ^limit)

  def set_limit(query, _), do: from(q in query, limit: @limit)
end
