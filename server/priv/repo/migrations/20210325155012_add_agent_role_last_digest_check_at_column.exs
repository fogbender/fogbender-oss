defmodule Fog.Repo.Migrations.AddAgentRoleLastDigestCheckAtColumn do
  use Ecto.Migration

  def change do
    alter table(:vendor_agent_role) do
      add(:last_digest_check_at, :timestamp, null: true)
    end
  end
end
