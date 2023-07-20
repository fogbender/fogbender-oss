defmodule Fog.Data.CustomerCrm do
  use Fog.Data
  alias Fog.Data.{Customer, Vendor}

  schema "customer_crm" do
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    belongs_to(:customer, Customer, type: Fog.Types.CustomerId)

    field(:crm_id, :string)
    field(:crm_remote_id, :string)

    field(:crm_type, :string)
    # native CRM id for account
    field(:crm_remote_account_id, :string)
    # Merge.dev id for account
    field(:crm_account_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [
      :vendor_id,
      :customer_id,
      :crm_id,
      :crm_remote_id,
      :crm_type,
      :crm_remote_account_id,
      :crm_account_id
    ])
    |> validate_required([
      :vendor_id,
      :customer_id,
      :crm_id,
      :crm_remote_id,
      :crm_type,
      :crm_remote_account_id
    ])
    |> unique_constraint([:vendor_id, :crm_remote_id, :crm_type, :crm_remote_account_id],
      name: :one_per_customer_uq_index
    )
    |> unique_constraint([:vendor_id, :crm_remote_id, :crm_type, :customer_id],
      name: :one_per_vendor_uq_index
    )
  end
end
