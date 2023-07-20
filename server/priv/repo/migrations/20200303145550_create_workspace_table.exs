defmodule Fog.Repo.Migrations.CreateWorkspaceTable do
  use Ecto.Migration

  def change do
    create table(:workspace, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:vendor_id, :bigint, null: false)
      add(:name, :text, null: false)

      timestamps()
    end
  end
end
