defmodule Fog.Data.Workspace do
  use Fog.Data

  alias Fog.Data.{
    Agent,
    Helpdesk,
    Vendor,
    Tag,
    WorkspaceAgentRole,
    WorkspaceFeatureFlag,
    WorkspaceIntegration
  }

  @derive {Jason.Encoder,
           only: [
             :id,
             :name,
             :description,
             :vendor_id,
             :signature_type,
             :triage_name,
             :inserted_at,
             :updated_at,
             :deleted_at,
             :deleted_by_agent_id
           ]}

  @primary_key {:id, Fog.Types.WorkspaceId, autogenerate: true}
  schema "workspace" do
    field(:name, :string)
    field(:description, :string)
    field(:signature_type, :string)
    field(:signature_secret, :string)
    field(:triage_name, :string)
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    has_many(:agents, WorkspaceAgentRole)
    has_many(:helpdesks, Helpdesk)
    has_many(:customers, through: [:helpdesks, :customer])
    has_many(:users, through: [:helpdesks, :users])
    has_many(:rooms, through: [:helpdesks, :rooms])
    has_many(:feature_flags, WorkspaceFeatureFlag)
    has_many(:tags, Tag)
    has_many(:integrations, WorkspaceIntegration)

    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    timestamps()
  end

  def changeset(workspace, params \\ %{}) do
    workspace
    |> cast(params, [
      :id,
      :vendor_id,
      :name,
      :description,
      :signature_type,
      :signature_secret,
      :triage_name,
      :deleted_at,
      :deleted_by_agent_id
    ])
    |> validate_required([:name, :signature_type, :signature_secret])
    |> cast_assoc(:helpdesks)
    |> cast_assoc(:agents)
  end
end
