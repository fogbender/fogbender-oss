defmodule Fog.Repo.Migrations.AddVendorVerifiedDomainsTable do
  use Ecto.Migration

  def change do
    create table(:vendor_verified_domain) do
      add(:vendor_id, :bigint, null: false)
      add(:domain, :text, null: false)
      add(:verification_code, :text)
      add(:verified, :boolean, null: false, default: false)

      timestamps()
    end

    create(
      unique_index(:vendor_verified_domain, [:vendor_id, :domain],
        name: :vendor_verified_domain_uq
      )
    )
  end
end
