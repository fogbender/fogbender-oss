defmodule Fog.Data.VendorAgentRole do
  use Fog.Data
  alias Fog.Data.{Vendor, Agent}

  @primary_key false
  schema "vendor_agent_role" do
    belongs_to(:vendor, Vendor, primary_key: true, type: Fog.Types.VendorId)
    belongs_to(:agent, Agent, primary_key: true, type: Fog.Types.AgentId)
    field(:role, :string)
    field(:last_activity_at, :utc_datetime_usec)
    field(:last_digest_check_at, :utc_datetime_usec)

    timestamps()
  end

  def changeset(role, params \\ %{}) do
    role
    |> cast(params, [:vendor_id, :agent_id, :role, :last_digest_check_at])
    |> validate_required([:role])
    |> validate_inclusion(:role, ["owner", "admin", "agent", "reader", "app", "assistant"])
  end
end
