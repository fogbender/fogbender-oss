defmodule Fog.Repo.Migrations.CreateIntegrationIssuesFromLog do
  use Ecto.Migration

  def up do
    Fog.Issue.create_from_log()
  end

  def down do
  end
end
