defmodule Fog.Data.IntegrationLog do
  use Fog.Data
  alias Fog.Data.{Workspace}

  @derive {Jason.Encoder, only: [:type, :workspace_id, :data]}

  schema "integration_log" do
    field(:type, :string)
    field(:data, :map)
    field(:integration_id, :integer)
    field(:integration_project_id, :string)

    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId)

    timestamps()
  end

  def changeset(integration_log, params \\ %{}) do
    integration_log
    |> cast(params, [:workspace_id, :integration_id, :integration_project_id, :type, :data])
    |> validate_required([:workspace_id, :type, :data])
  end
end
