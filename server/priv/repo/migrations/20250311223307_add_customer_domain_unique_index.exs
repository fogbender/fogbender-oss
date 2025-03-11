defmodule Fog.Repo.Migrations.AddCustomerDomainUniqueIndex do
  use Ecto.Migration

  def change do
    create(unique_index(:customer_domain, [:vendor_id, :customer_id, :domain]))
  end
end
