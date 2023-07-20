defmodule Fog.Data.CustomerDomain do
  use Fog.Data
  alias Fog.Data.{Customer, Vendor}

  schema "customer_domain" do
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    belongs_to(:customer, Customer, type: Fog.Types.CustomerId)
    field(:domain, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:vendor_id, :customer_id, :domain])
    |> validate_required([:vendor_id, :customer_id, :domain])
  end
end
