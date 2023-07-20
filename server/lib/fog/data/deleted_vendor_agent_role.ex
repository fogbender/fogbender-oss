defmodule Fog.Data.DeletedVendorAgentRole do
  use Fog.Data
  alias Fog.Data.{Vendor, Agent}

  @primary_key false
  schema "deleted_vendor_agent_role" do
    belongs_to(:vendor, Vendor, primary_key: true, type: Fog.Types.VendorId)
    belongs_to(:agent, Agent, primary_key: true, type: Fog.Types.AgentId)
    field(:role, :string)

    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    timestamps()
  end

  def changeset(role, params \\ %{}) do
    role
    |> cast(params, [:vendor_id, :agent_id, :role, :deleted_by_agent_id, :deleted_at])
    |> validate_required([:role])
    |> validate_inclusion(:role, ["owner", "admin", "agent", "reader", "app"])
  end
end
