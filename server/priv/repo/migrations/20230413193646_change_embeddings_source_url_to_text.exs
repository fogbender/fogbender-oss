defmodule Fog.Repo.Migrations.ChangeEmbeddingsSourceUrlToText do
  use Ecto.Migration

  def change do
    alter table(:embeddings_source) do
      modify(:url, :text)
    end
  end
end
