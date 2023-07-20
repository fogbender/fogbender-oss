defmodule Fog.Repo.Migrations.CreateEmbeddingsCacheTable do
  use Ecto.Migration

  def change do
    create table(:embeddings_cache, primary_key: false) do
      add(:prompt_id, :uuid, primary_key: true)
      add(:prompt, :text, null: false)
      add(:model, :text, null: false)
      add(:tokens, :integer, null: false)
      add(:embedding, {:array, :float}, null: false)
      timestamps()
    end
  end
end
