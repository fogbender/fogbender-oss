defmodule Fog.Repo.Migrations.AddMentionTable do
  use Ecto.Migration

  def change do
    create table(:mention, primary_key: false) do
      add(:message_id, :bigint, null: false, primary_key: true)
      add(:user_id, :bigint, null: false, default: 0, primary_key: true)
      add(:agent_id, :bigint, null: false, default: 0, primary_key: true)

      timestamps()
    end
  end
end
