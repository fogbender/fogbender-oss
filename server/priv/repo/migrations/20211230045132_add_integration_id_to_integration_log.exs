defmodule Fog.Repo.Migrations.AddIntegrationIdToIntegrationLog do
  use Ecto.Migration

  def change do
    alter table(:integration_log) do
      add(:integration_id, :bigint, null: true)
    end
  end
end
