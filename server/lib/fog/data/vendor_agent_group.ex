defmodule Fog.Data.VendorAgentGroup do
  use Fog.Data
  alias Fog.Data.{Vendor, Agent}

  @primary_key false
  schema "vendor_agent_group" do
    belongs_to(:vendor, Vendor, primary_key: true, type: Fog.Types.VendorId)
    belongs_to(:agent, Agent, primary_key: true, type: Fog.Types.AgentId)
    field(:group, :string)

    timestamps()
  end

  def changeset(group, params \\ %{}) do
    group
    |> cast(params, [:vendor_id, :agent_id, :group])
    |> validate_required([:vendor_id, :agent_id, :group])
    |> unique_constraint([:vendor_id, :agent_id, :group], name: :vendor_agent_group_uq_index)
  end
end
