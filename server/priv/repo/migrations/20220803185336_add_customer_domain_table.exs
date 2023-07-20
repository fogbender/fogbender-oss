defmodule Fog.Repo.Migrations.AddCustomerDomainTable do
  use Ecto.Migration

  def change do
    create table(:customer_domain) do
      add(:customer_id, :bigint, null: false)
      add(:vendor_id, :bigint, null: false)
      add(:domain, :text, null: false)
      timestamps()
    end

    create(index(:customer_domain, [:customer_id]))
    create(unique_index(:customer_domain, [:vendor_id, :domain]))
  end
end
