defmodule Fog.Repo.Migrations.AddIssueNumberToIntegrationIssue do
  use Ecto.Migration

  def change do
    alter table(:integration_issue) do
      add(:issue_number, :text, null: false)
    end
  end
end
