defmodule Fog.Repo.Migrations.AddLinkInfoToMessage do
  use Ecto.Migration

  def change do
    alter table(:message) do
      add(:link_room_id, :bigint, null: true)
      add(:link_start_message_id, :bigint, null: true)
      add(:link_end_message_id, :bigint, null: true)
      add(:link_type, :text, null: true)
    end

    create table(:message_link) do
      add(:source_message_id, :bigint, null: false)
      add(:target_message_id, :bigint, null: false)
      add(:target_room_id, :bigint, null: false)
      add(:type, :text, null: false)
    end

    create(index(:message_link, [:source_message_id]))
  end
end
