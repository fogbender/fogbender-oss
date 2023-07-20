defmodule Fog.Repo.Migrations.AddRoomResolved do
  use Ecto.Migration

  def change do
    alter table(:room) do
      add(:resolved, :boolean, null: false, default: false)
      add(:resolved_by_agent_id, :bigint, null: true)
      add(:resolved_at, :utc_datetime_usec, null: true)
      add(:resolved_til, :utc_datetime_usec, null: true)
    end

    create(index(:room, [:resolved, :resolved_til]))
  end
end
