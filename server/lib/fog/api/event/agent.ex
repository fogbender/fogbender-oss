defmodule Fog.Api.Event.Agent do
  import Ecto.Query

  alias Fog.{Repo, Data, PubSub, Utils}
  alias Fog.Repo.Query
  alias Fog.Api.Event.Agent

  use Fog.StructAccess

  defstruct [
    :msgType,
    :msgId,
    :id,
    :email,
    :name,
    :role,
    :imageUrl,
    :createdTs,
    :updatedTs,
    :deletedTs,
    :deletedById,
    :updatedById
  ]

  def load_inserted(%Data.Vendor{id: id} = ctx, opts, _sess) do
    vendors_query = from(r in Data.VendorAgentRole, where: r.vendor_id == ^id)

    Data.Agent
    |> Query.with_ctx(ctx)
    |> Query.inserted(opts)
    |> Repo.all()
    |> Repo.preload(vendors: vendors_query)
    |> Enum.map(&from_data/1)
  end

  def load_updated(%Data.Vendor{id: id} = ctx, opts, _sess) do
    vendors_query = from(r in Data.VendorAgentRole, where: r.vendor_id == ^id)

    Data.Agent
    |> Query.with_ctx(ctx)
    |> Query.updated(opts)
    |> Repo.all()
    |> Repo.preload(vendors: vendors_query)
    |> Enum.map(&from_data/1)
  end

  def publish(%Data.Agent{} = a, vendor_id, details \\ %{}) do
    vendors_query = from(r in Data.VendorAgentRole, where: r.vendor_id == ^vendor_id)

    a = Repo.preload(a, vendors: vendors_query)
    e = from_data(a, details)

    for t <- topics(vendor_id), do: PubSub.publish(t, e)

    :ok
  end

  defp topics(vendor_id) do
    [
      "vendor/#{vendor_id}/agents"
    ]
  end

  def from_data(%Data.Agent{} = a, details \\ %{}) do
    vendor =
      case a.vendors do
        vendors when is_list(vendors) and length(vendors) == 1 ->
          [vendor | _] = vendors
          vendor

        _ ->
          nil
      end

    deleted_at = Map.get(details, :deleted_at)
    deleted_by = Map.get(details, :deleted_by)
    updated_at = Map.get(details, :updated_at)
    updated_by = Map.get(details, :updated_by)

    %Agent{
      id: a.id,
      updatedTs: (updated_at || deleted_at || a.updated_at) |> Utils.to_unix(),
      createdTs: a.inserted_at |> Utils.to_unix(),
      name: a.name,
      email: a.email,
      imageUrl: a.image_url,
      role: vendor && vendor.role,
      deletedTs: deleted_by && deleted_at |> Utils.to_unix(),
      deletedById: deleted_by,
      updatedById: updated_by
    }
  end
end
