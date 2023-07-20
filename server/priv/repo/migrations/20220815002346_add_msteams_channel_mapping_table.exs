defmodule Fog.Repo.Migrations.AddMsteamsChannelMappingTable do
  use Ecto.Migration

  def change do
    create table(:msteams_channel_mapping, primary_key: false) do
      add(:room_id, :bigint, null: false)
      add(:channel_id, :text, null: false)
      add(:conversation_id, :text, null: false)

      timestamps()
    end

    create(index(:msteams_channel_mapping, [:room_id]))
    create(index(:msteams_channel_mapping, [:conversation_id]))
    create(unique_index(:msteams_channel_mapping, [:room_id, :channel_id]))
    create(unique_index(:msteams_channel_mapping, [:room_id, :channel_id, :conversation_id]))
  end
end
