defmodule Fog.Data.VendorVerifiedDomain do
  use Fog.Data

  alias Fog.Data.{Vendor}

  @derive {Jason.Encoder,
           only: [:vendor_id, :domain, :verification_code, :verified, :inserted_at, :updated_at]}
  schema "vendor_verified_domain" do
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    field(:domain, :string)
    field(:verification_code, :string)
    field(:verified, :boolean, default: false)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:vendor_id, :domain, :verification_code, :verified])
    |> validate_required([:vendor_id, :domain])
    |> unique_constraint([:vendor_id, :domain], name: :vendor_verified_domain_uq)
  end
end
