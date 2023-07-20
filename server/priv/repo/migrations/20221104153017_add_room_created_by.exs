defmodule Fog.Repo.Migrations.AddRoomCreatedBy do
  use Ecto.Migration

  def change do
    alter table(:room) do
      add(:created_by_agent_id, :bigint, null: true)
      add(:created_by_user_id, :bigint, null: true)
    end
  end
end
