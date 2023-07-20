defmodule Fog.Repo.Migrations.CreateMessageTable do
  use Ecto.Migration

  def change do
    create table(:message, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:room_id, :bigint, null: false)
      add(:from_agent_id, :bigint, null: true)
      add(:from_user_id, :bigint, null: true)
      add(:client_id, :text, null: false, default: "")
      add(:text, :text, null: false)

      timestamps()
    end

    create(index(:message, [:room_id]))
  end
end
