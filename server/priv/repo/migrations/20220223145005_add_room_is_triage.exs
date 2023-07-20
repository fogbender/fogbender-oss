defmodule Fog.Repo.Migrations.AddRoomIsTriage do
  use Ecto.Migration

  def change do
    alter table(:room) do
      add(:is_triage, :boolean, null: false, default: false)
    end

    create(unique_index(:room, [:helpdesk_id, :is_triage], where: :is_triage))

    execute("UPDATE room SET is_triage = true where name = 'Triage'", "")
  end
end
