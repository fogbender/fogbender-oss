defmodule Fog.Data.IntegrationIssue do
  use Fog.Data

  @all [:workspace_id, :type, :project_id, :issue_id, :issue_number, :name, :url, :state]
  @required [:workspace_id, :type, :project_id, :issue_id, :issue_number, :name, :url]

  schema "integration_issue" do
    belongs_to(:workspace, Data.Workspace, type: Types.WorkspaceId)
    field(:type, :string)
    field(:project_id, :string)
    field(:issue_id, :string)
    field(:issue_number, :string)
    field(:name, :string)
    field(:url, :string)
    field(:state, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, @all)
    |> validate_required(@required)
    |> unique_constraint([:workspace_id, :type, :project_id, :issue_id])
    |> validate_inclusion(:state, ["open", "closed"])
  end
end
