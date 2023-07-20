defmodule Fog.Repo.Migrations.AddRestrictPathToEmbeddingsSource do
  use Ecto.Migration

  def change do
    alter table(:embeddings_source) do
      add(:restrict_path, :text, null: true)
    end
  end
end
