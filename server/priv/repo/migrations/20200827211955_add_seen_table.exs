defmodule Fog.Repo.Migrations.AddSeenTable do
  use Ecto.Migration

  def change do
    create table(:seen) do
      add(:room_id, :bigint, null: false)
      add(:message_id, :bigint, null: false)
      add(:user_id, :bigint)
      add(:agent_id, :bigint)

      timestamps()
    end

    create(unique_index(:seen, [:room_id, :user_id]))
    create(unique_index(:seen, [:room_id, :agent_id]))
  end
end
