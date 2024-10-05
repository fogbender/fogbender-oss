defmodule Fog.Repo.Migrations.AddRoomMembershipIndex do
  use Ecto.Migration

  def change do
    create index(:room_membership, [:room_id, :agent_id], where: "agent_id IS NOT NULL", name: :idx_room_membership_room_agent)
    create index(:room_membership, [:room_id, :user_id], where: "user_id IS NOT NULL", name: :idx_room_membership_room_user)
  end
end
