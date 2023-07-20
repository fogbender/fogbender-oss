defmodule Fog.Repo.Migrations.AddFeatureFlagTable do
  use Ecto.Migration

  def change do
    create table(:feature_flag, primary_key: false) do
      add(:id, :text, primary_key: true)

      timestamps()
    end

    create table(:workspace_feature_flag) do
      add(:feature_flag_id, :text)
      add(:workspace_id, :bigint)
    end

    create(unique_index(:workspace_feature_flag, [:feature_flag_id, :workspace_id]))
  end
end
