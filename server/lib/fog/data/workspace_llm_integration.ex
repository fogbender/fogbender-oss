defmodule Fog.Data.WorkspaceLlmIntegration do
  use Fog.Data
  alias Fog.Data.{Workspace}

  @derive {Jason.Encoder,
           only: [
             :provider,
             :workspace_id,
             :assistant_id,
             :assistant_name,
             :mcp_appliance_url,
             :enabled,
             :version,
             :default
           ]}

  @primary_key false
  schema "workspace_llm_integration" do
    field(:provider, :string, primary_key: true)
    field(:assistant_id, :string, primary_key: true)
    field(:api_key, :string)
    field(:assistant_name, :string)
    field(:mcp_appliance_url, :string)
    field(:enabled, :boolean)
    field(:version, :string)
    field(:default, :boolean)

    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId, primary_key: true)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [
      :workspace_id,
      :provider,
      :api_key,
      :assistant_id,
      :assistant_name,
      :mcp_appliance_url,
      :version,
      :enabled,
      :default
    ])
    |> validate_required([:workspace_id, :provider, :assistant_id, :version])
  end
end
