defmodule Fog.Repo.Migrations.AddIntegrationProjectIdToIntegrationLog do
  use Ecto.Migration

  def change do
    alter table(:integration_log) do
      add(:integration_project_id, :text, null: true)
    end
  end
end
