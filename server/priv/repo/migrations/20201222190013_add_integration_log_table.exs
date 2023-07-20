defmodule Fog.Repo.Migrations.AddIntegrationLogTable do
  use Ecto.Migration

  def change do
    create table(:integration_log) do
      add(:workspace_id, :bigint, null: false)
      add(:type, :text, null: false)
      add(:data, :map, null: false)

      timestamps()
    end
  end
end
