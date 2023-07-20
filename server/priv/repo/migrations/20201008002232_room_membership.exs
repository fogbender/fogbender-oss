defmodule Fog.Repo.Migrations.RoomMembership do
  use Ecto.Migration

  def change do
    alter table(:room) do
      add(:type, :text, null: false, default: "public")
      add(:dialog_id, :text, null: true)
    end

    create(unique_index(:room, [:dialog_id]))

    create table(:room_membership, primary_key: false) do
      add(:helpdesk_id, :bigint)
      add(:room_id, :bigint)
      add(:user_id, :bigint, null: true)
      add(:agent_id, :bigint, null: true)
      add(:role, :text)
      add(:status, :text)
    end

    create(unique_index(:room_membership, [:helpdesk_id, :room_id, :user_id, :agent_id]))

    create(
      constraint(:room_membership, "non_null_author",
        check: "coalesce(nullif(agent_id, '0') , '0' ) != coalesce(nullif(user_id, '0') , '0' )"
      )
    )
  end
end
