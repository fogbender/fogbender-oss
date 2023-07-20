defmodule Fog.Repo.Migrations.MessageReaction do
  use Ecto.Migration

  def change do
    create table(:message_reaction) do
      add(:message_id, :bigint, null: false)
      add(:user_id, :bigint)
      add(:agent_id, :bigint)
      add(:reaction, :text, null: false)

      timestamps()
    end

    create(unique_index(:message_reaction, [:message_id, :user_id]))
    create(unique_index(:message_reaction, [:message_id, :agent_id]))
  end
end
