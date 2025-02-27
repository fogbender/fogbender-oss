defmodule Fog.Repo.Migrations.AddLlmFileMappingTable do
  use Ecto.Migration

  def change do
    create table(:llm_file_mapping, primary_key: false) do
      add(:provider, :text, null: false)
      add(:provider_file_id, :text, null: false)
      add(:file_id, :bigint, null: false)
    end

    create(unique_index(:llm_file_mapping, [:provider, :provider_file_id, :file_id]))
  end
end
