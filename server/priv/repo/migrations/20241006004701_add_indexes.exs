defmodule Fog.Repo.Migrations.AddIndexes do
  use Ecto.Migration

  def change do
    create(
      index(:room_membership, [:helpdesk_id, :room_id, :agent_id, :user_id],
        name: :idx_room_membership_helpdesk_room_agent_user
      )
    )

    create(index(:seen, [:room_id, :user_id], name: :idx_seen_room_user))
    create(index(:seen, [:room_id, :agent_id], name: :idx_seen_room_agent))
  end
end
