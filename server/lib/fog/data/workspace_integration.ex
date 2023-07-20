defmodule Fog.Data.WorkspaceIntegration do
  use Fog.Data
  alias Fog.Data.{Workspace}

  @derive {Jason.Encoder, only: [:type, :workspace_id, :project_id, :specifics]}

  schema "workspace_integration" do
    field(:type, :string)
    field(:project_id, :string)
    field(:specifics, :map)

    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId)

    timestamps()
  end

  def changeset(workspace_integration, params \\ %{}) do
    workspace_integration
    |> cast(params, [:workspace_id, :type, :project_id, :specifics])
    |> validate_required([:workspace_id, :type, :project_id, :specifics])
    |> validate_inclusion(:type, [
      "gitlab",
      "linear",
      "asana",
      "github",
      "jira",
      "height",
      "trello",
      "slack",
      "msteams",
      "slack-customer",
      "hubspot",
      "ai",
      "pagerduty",
      "salesforce"
    ])
  end
end
