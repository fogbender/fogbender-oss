defmodule Fog.Repo.Migrations.AddWorkspaceIntegrationTable do
  use Ecto.Migration

  def change do
    create table(:workspace_integration) do
      add(:workspace_id, :bigint, null: false)
      add(:type, :text, null: false)
      add(:project_id, :text, null: false)
      add(:specifics, :map, null: false)

      timestamps()
    end

    create(
      unique_index(:workspace_integration, [:workspace_id, :type, :project_id],
        name: :workspace_id_type_project_id_uq_index
      )
    )
  end
end
