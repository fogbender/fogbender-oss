defmodule Fog.Repo.Migrations.WorkspaceAgentNameOverride do
  use Ecto.Migration

  def change do
    alter table(:workspace) do
      add(:agent_name_override, :string)
    end
  end
end
