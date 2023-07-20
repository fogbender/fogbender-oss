defmodule Fog.Repo.Migrations.AddCustomerCrmTable do
  use Ecto.Migration

  def change do
    drop_if_exists(unique_index(:customer_domain, [:vendor_id, :domain]))

    create table(:customer_crm) do
      add(:customer_id, :bigint, null: false)
      add(:vendor_id, :bigint, null: false)
      add(:crm_id, :text, null: false)
      add(:crm_remote_id, :text, null: false)
      add(:crm_type, :text, null: false)
      add(:crm_remote_account_id, :text, null: false)
      add(:crm_account_id, :text, null: false)

      timestamps()
    end

    create(index(:customer_crm, [:customer_id]))

    create(
      unique_index(:customer_crm, [:vendor_id, :crm_remote_id, :crm_type, :crm_remote_account_id],
        name: :one_per_customer_uq_index
      )
    )

    create(
      unique_index(:customer_crm, [:vendor_id, :crm_remote_id, :crm_type, :customer_id],
        name: :one_per_vendor_uq_index
      )
    )
  end
end
