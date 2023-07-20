defmodule Fog.Repo.Migrations.AddAgentRoleLastActivityAtColumn do
  use Ecto.Migration

  def change do
    alter table(:vendor_agent_role) do
      add(:last_activity_at, :timestamp, null: true)
    end
  end
end
