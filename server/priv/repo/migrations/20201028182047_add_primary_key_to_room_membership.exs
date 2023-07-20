defmodule Fog.Repo.Migrations.AddPrimaryKeyToRoomMembership do
  use Ecto.Migration

  def change do
    alter table(:room_membership) do
      add(:id, :bigint, primary_key: true, default: fragment("snowflake_id(1)"))
    end
  end
end
