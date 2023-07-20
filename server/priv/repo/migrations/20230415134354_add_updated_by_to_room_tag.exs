defmodule Fog.Repo.Migrations.AddUpdatedByToRoomTag do
  use Ecto.Migration

  def change do
    alter table(:room_tag) do
      add(:updated_by_agent_id, :bigint, null: true)
      add(:updated_by_user_id, :bigint, null: true)
    end
  end
end
