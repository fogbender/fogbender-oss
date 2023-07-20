defmodule Fog.Repo.Migrations.CreateWorkspaceAgentRoleTable do
  use Ecto.Migration

  def change do
    create table(:workspace_agent_role, primary_key: false) do
      add(:workspace_id, :bigint, primary_key: true)
      add(:agent_id, :bigint, primary_key: true)
      add(:role, :text, null: false)

      timestamps()
    end
  end
end
