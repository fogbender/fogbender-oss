defmodule Fog.Repo.Migrations.AddCrmNoteMappingTable do
  use Ecto.Migration

  def change do
    create table(:crm_note_mapping, primary_key: false) do
      add(:room_id, :bigint, null: false, primary_key: true)
      add(:crm_id, :text, null: false, primary_key: true)
      add(:crm_type, :text, null: false, primary_key: true)
      add(:inserted_at, :naive_datetime, primary_key: true)
      add(:note_id, :text)

      timestamps(inserted_at: false)
    end

    create(unique_index(:crm_note_mapping, [:room_id, :crm_id, :crm_type, :inserted_at]))
  end
end
