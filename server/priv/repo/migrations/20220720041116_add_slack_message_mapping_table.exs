defmodule Fog.Repo.Migrations.AddSlackMessageMappingTable do
  use Ecto.Migration

  def change do
    create table(:slack_message_mapping, primary_key: false) do
      add(:message_id, :bigint, null: false)
      add(:slack_message_ts, :text, null: false)
      add(:slack_channel_id, :text, null: false)

      timestamps()
    end

    create(index(:slack_message_mapping, [:message_id]))
    create(index(:slack_message_mapping, [:slack_message_ts]))

    create(
      unique_index(:slack_message_mapping, [:message_id, :slack_message_ts, :slack_channel_id])
    )
  end
end
