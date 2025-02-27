defmodule Fog.Repo.Migrations.UpdateWorkspaceLlmIntegration do
  use Ecto.Migration

  def change do
    alter table(:workspace_llm_integration) do
      add(:version, :text, null: false, default: "1.0")
    end

    rename(table(:workspace_llm_integration), :tool_url, to: :mcp_appliance_url)

    drop_if_exists(
      unique_index(
        :workspace_llm_integration,
        [:workspace_id, :provider, :assistant_id],
        name: :workspace_llm_integration_uq
      )
    )

    create(
      unique_index(
        :workspace_llm_integration,
        [:workspace_id, :provider, :assistant_id, :version],
        name: :workspace_llm_integration_uq
      )
    )

    create(
      unique_index(
        :workspace_llm_integration,
        [:workspace_id, :provider],
        where: "enabled = true",
        name: :workspace_llm_integration_enabled_uq
      )
    )
  end
end
