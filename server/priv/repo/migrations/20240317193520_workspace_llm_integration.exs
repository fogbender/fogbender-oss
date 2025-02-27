defmodule Fog.Repo.Migrations.WorkspaceLlmIntegration do
  use Ecto.Migration

  def change do
    create table(:workspace_llm_integration, primary_key: false) do
      add(:workspace_id, :bigint, null: false, primary_key: true)
      add(:provider, :text, null: false, primary_key: true)

      add(:assistant_id, :text,
        null: false,
        default: fragment("gen_random_uuid()::text"),
        primary_key: true
      )

      add(:api_key, :text, null: false)
      add(:assistant_name, :text)
      add(:tool_url, :text)
      add(:enabled, :boolean, default: false)
      add(:default, :boolean, default: false)

      timestamps()
    end

    create(
      unique_index(:workspace_llm_integration, [:workspace_id, :provider, :assistant_id],
        name: :workspace_llm_integration_uq
      )
    )
  end
end
