defmodule Fog.Data.Customer do
  use Fog.Data

  alias Fog.Data.{Agent, CustomerDomain, CustomerCrm, CustomerInfoLog, Helpdesk, Vendor}

  @derive {Jason.Encoder, only: [:id, :name]}
  @primary_key {:id, Fog.Types.CustomerId, autogenerate: true}
  schema "customer" do
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    field(:name, :string)
    field(:external_uid, :string)
    has_many(:helpdesks, Helpdesk)
    has_many(:info_logs, CustomerInfoLog)
    has_many(:domains, CustomerDomain, on_replace: :delete)
    has_many(:crms, CustomerCrm, on_replace: :delete)
    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    timestamps()
  end

  def changeset(customer, params \\ %{}) do
    customer
    |> cast(params, [
      :id,
      :vendor_id,
      :name,
      :external_uid,
      :deleted_by_agent_id,
      :deleted_at
    ])
    |> validate_required([:name])
    |> validate_deleted()
    |> unique_constraint(:external_uid, name: :customer_vendor_id_external_uid_index)
    |> cast_assoc(:info_logs)
    |> cast_assoc(:domains)
    |> cast_assoc(:crms)
  end

  defp validate_deleted(changeset) do
    agent = get_field(changeset, :deleted_by_agent_id)
    deleted_at = get_field(changeset, :deleted_at)

    cond do
      agent != nil && deleted_at == nil ->
        add_error(changeset, :deleted_by_agent_id, "deleted_at required but missing")

      deleted_at != nil && agent == nil ->
        add_error(
          changeset,
          :deleted_at,
          "deleted_by_agent_id required but missing"
        )

      true ->
        changeset
    end
  end
end
