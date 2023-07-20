defmodule Fog.Repo.Migrations.AddDeletedAtAndRoleToAgentInvite do
  use Ecto.Migration

  def change do
    alter table(:vendor_agent_invite) do
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:role, :text, null: false, default: "agent")
    end
  end
end
