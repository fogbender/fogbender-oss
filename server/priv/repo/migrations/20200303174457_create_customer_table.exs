defmodule Fog.Repo.Migrations.CreateCustomerTable do
  use Ecto.Migration

  def change do
    create table(:customer, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:vendor_id, :bigint, null: false)
      add(:name, :text, null: false)
      add(:external_uid, :text, null: true)

      timestamps()
    end
  end
end
