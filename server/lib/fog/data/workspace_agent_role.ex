defmodule Fog.Data.WorkspaceAgentRole do
  use Fog.Data
  alias Fog.Data.{Workspace, Agent}

  @primary_key false
  schema "workspace_agent_role" do
    belongs_to(:workspace, Workspace, primary_key: true, type: Fog.Types.WorkspaceId)
    belongs_to(:agent, Agent, primary_key: true, type: Fog.Types.AgentId)
    field(:role, :string)

    timestamps()
  end

  def changeset(role, params \\ %{}) do
    role
    |> cast(params, [:workspace_id, :agent_id, :role])
    |> validate_required([:workspace_id, :agent_id, :role])
    |> validate_inclusion(:role, ["admin", "user"])
  end
end
