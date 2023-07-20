defmodule Fog.Repo.Migrations.CreateTablePromptCluster do
  use Ecto.Migration

  def change do
    create table(:prompt_cluster, primary_key: false) do
      add(:id, :uuid, null: false, primary_key: true)
      add(:cluster_id, :text, null: false, primary_key: true)
      add(:source_id, :uuid, null: false)
      add(:prompt, :text, null: false)
      add(:data, :map, null: false)
      add(:embedding, {:array, :float})
      add(:status, :text, default: "fetching")
      timestamps()
    end

    create(
      unique_index(:prompt_cluster, [:cluster_id, :id], name: "prompt_cluster_id_uniq_index")
    )
  end
end
