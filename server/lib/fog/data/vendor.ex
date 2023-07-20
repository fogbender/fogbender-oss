defmodule Fog.Data.Vendor do
  use Fog.Data

  alias Fog.Data.{
    Agent,
    Customer,
    VendorAgentGroup,
    VendorAgentInvite,
    VendorAgentRole,
    VendorApiToken,
    Workspace
  }

  @derive {Jason.Encoder, only: [:id, :name, :status, :inserted_at, :updated_at, :deleted_at]}
  @primary_key {:id, Fog.Types.VendorId, autogenerate: true}
  schema "vendor" do
    field(:name, :string)
    has_many(:agents, VendorAgentRole)
    has_many(:workspaces, Workspace)
    has_many(:invites, VendorAgentInvite)
    has_many(:customers, Customer)
    has_many(:domains, through: [:customers, :domains])
    has_many(:groups, VendorAgentGroup)
    has_many(:api_tokens, VendorApiToken)

    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    field(:status, :string, default: "active")

    timestamps()
  end

  def changeset(vendor, params \\ %{}) do
    vendor
    |> cast(params, [
      :id,
      :status,
      :name,
      :deleted_at,
      :deleted_by_agent_id
    ])
    |> validate_required([:name, :status])
    |> validate_inclusion(:status, ["archived", "active"])
    |> cast_assoc(:customers)
    |> cast_assoc(:workspaces)
    |> cast_assoc(:agents)
    |> cast_assoc(:groups)
    |> cast_assoc(:api_tokens)
  end
end
