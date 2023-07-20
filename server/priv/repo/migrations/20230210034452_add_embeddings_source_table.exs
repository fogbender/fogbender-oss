defmodule Fog.Repo.Migrations.AddEmbeddingsSourceTable do
  use Ecto.Migration

  def change do
    create table(:embeddings_source, primary_key: false) do
      add(:id, :uuid, primary_key: true, null: false)
      add(:parent_id, :uuid)
      add(:text, :text)
      add(:url, :string, null: false)
      add(:description, :text)
      add(:status, :string)
      add(:workspace_id, :bigint, null: false)
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)

      timestamps()
    end

    create(unique_index(:embeddings_source, [:workspace_id, :url]))
  end
end
