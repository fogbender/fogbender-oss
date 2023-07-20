defmodule Fog.Api.Event.Customer do
  alias Fog.{Repo, Data, PubSub, Utils}
  alias Fog.Repo.Query
  alias Fog.Api.Event.Customer

  defstruct [
    :msgType,
    :msgId,
    :id,
    :external_uid,
    :vendorId,
    :workspaceId,
    :helpdeskId,
    :name,
    :updatedTs,
    :createdTs,
    :deletedTs,
    :usersCount,
    :lastMessageAt
  ]

  def load_updated(ctx, opts, _sess), do: load(ctx, opts)
  def load_inserted(ctx, opts, _sess), do: load(ctx, opts)

  def load(ctx, opts) do
    Data.Helpdesk
    |> Query.with_ctx(ctx)
    |> Query.inserted(opts)
    |> Repo.all()
    |> from_data()
  end

  def publish(%Data.Helpdesk{} = h) do
    [e] = from_data([h])
    for t <- topics(h), do: PubSub.publish(t, e)
    :ok
  end

  def from_data(list) when is_list(list) do
    list
    |> preload()
    |> Enum.map(&from_data/1)
  end

  def from_data(%Data.Helpdesk{} = h) do
    %Customer{
      id: h.customer.id,
      external_uid: h.customer.external_uid,
      vendorId: h.customer.vendor_id,
      workspaceId: h.workspace_id,
      helpdeskId: h.id,
      name: h.customer.name,
      updatedTs: h.updated_at |> Utils.to_unix(),
      createdTs: h.inserted_at |> Utils.to_unix(),
      deletedTs: customer_deleted_at(h.customer.deleted_at),
      lastMessageAt: if(h.last_message_at, do: Utils.to_unix(h.last_message_at)),
      usersCount: h.users_count
    }
  end

  defp preload(data) do
    Repo.preload(data, [:customer])
  end

  defp topics(%Data.Helpdesk{} = h) do
    [
      "workspace/#{h.workspace_id}/customers"
    ]
  end

  defp customer_deleted_at(nil), do: nil
  defp customer_deleted_at(deleted_at), do: deleted_at |> Utils.to_unix()
end
