defmodule Fog.Repo.Migrations.AddStateColumnToIntegrationIssue do
  use Ecto.Migration

  def change do
    alter table(:integration_issue) do
      add(:state, :text)
    end
  end
end
