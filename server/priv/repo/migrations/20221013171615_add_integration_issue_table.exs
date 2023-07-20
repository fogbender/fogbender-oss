defmodule Fog.Repo.Migrations.AddIntegrationIssueTable do
  use Ecto.Migration

  def change do
    create table(:integration_issue) do
      add(:workspace_id, :bigint, null: false)
      add(:type, :text, null: false)
      add(:project_id, :text, null: false)
      add(:issue_id, :text, null: false)
      add(:name, :text, null: false)
      add(:url, :text, null: false)

      timestamps()
    end

    create(unique_index(:integration_issue, [:workspace_id, :type, :project_id, :issue_id]))
  end
end
