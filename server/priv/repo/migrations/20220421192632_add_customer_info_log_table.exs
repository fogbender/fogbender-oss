defmodule Fog.Repo.Migrations.AddCustomerInfoLogTable do
  use Ecto.Migration

  def change do
    create table(:customer_info_log) do
      add(:customer_id, :bigint, null: false)
      add(:source, :text, null: false)
      add(:data, :map, null: false)

      timestamps()
    end

    create(index(:customer_info_log, [:customer_id]))
  end
end
