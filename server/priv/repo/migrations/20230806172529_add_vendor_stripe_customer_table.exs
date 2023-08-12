defmodule Fog.Repo.Migrations.AddVendorStripeCustomerTable do
  use Ecto.Migration

  def change do
    create table(:vendor_stripe_customer, primary_key: false) do
      add(:vendor_id, :bigint, null: false)
      add(:stripe_customer_id, :text, null: false)

      timestamps()
    end

    create(
      unique_index(:vendor_stripe_customer, [
        :vendor_id,
        :stripe_customer_id
      ])
    )
  end
end
