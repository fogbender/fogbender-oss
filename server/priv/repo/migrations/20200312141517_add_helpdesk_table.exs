defmodule Fog.Repo.Migrations.AddHelpdeskTable do
  use Ecto.Migration

  def change do
    create table(:helpdesk, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:customer_id, :bigint, null: false)
      add(:workspace_id, :bigint, null: false)
      add(:name, :text, null: true)

      timestamps()
    end

    create(unique_index(:helpdesk, [:workspace_id, :customer_id]))
  end
end
