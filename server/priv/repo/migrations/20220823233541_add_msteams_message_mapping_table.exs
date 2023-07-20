defmodule Fog.Repo.Migrations.AddMsteamsMessageMappingTable do
  use Ecto.Migration

  def change do
    create table(:msteams_message_mapping, primary_key: false) do
      add(:message_id, :bigint, null: false)
      add(:msteams_message_id, :text, null: false)
      add(:msteams_channel_id, :text, null: false)
      add(:msteams_message_meta, :map, default: "{}")

      timestamps()
    end

    create(index(:msteams_message_mapping, [:message_id]))
    create(index(:msteams_message_mapping, [:msteams_channel_id, :msteams_message_id]))

    create(
      unique_index(:msteams_message_mapping, [
        :message_id,
        :msteams_message_id,
        :msteams_channel_id
      ])
    )
  end
end
