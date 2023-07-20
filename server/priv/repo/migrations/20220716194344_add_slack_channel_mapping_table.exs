defmodule Fog.Repo.Migrations.AddSlackChannelMappingTable do
  use Ecto.Migration

  def change do
    create table(:slack_channel_mapping, primary_key: false) do
      add(:room_id, :bigint, null: false)
      add(:channel_id, :text, null: false)
      add(:thread_id, :text, null: false)

      timestamps()
    end

    create(index(:slack_channel_mapping, [:room_id]))
    create(index(:slack_channel_mapping, [:thread_id]))
    create(unique_index(:slack_channel_mapping, [:room_id, :channel_id, :thread_id]))
  end
end
