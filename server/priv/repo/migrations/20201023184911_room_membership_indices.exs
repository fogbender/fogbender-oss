defmodule Fog.Repo.Migrations.RoomMembershipIndices do
  use Ecto.Migration

  def change do
    drop(unique_index(:room_membership, [:helpdesk_id, :room_id, :user_id, :agent_id]))
    create(unique_index(:room_membership, [:helpdesk_id, :room_id, :user_id]))
    create(unique_index(:room_membership, [:helpdesk_id, :room_id, :agent_id]))
  end
end
