defmodule Fog.Repo.Migrations.AddRoomTable do
  use Ecto.Migration

  def change do
    create table(:room, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:helpdesk_id, :bigint, null: false)
      add(:name, :text, null: false)

      timestamps()
    end

    create(unique_index(:room, [:helpdesk_id, :name]))
  end
end
