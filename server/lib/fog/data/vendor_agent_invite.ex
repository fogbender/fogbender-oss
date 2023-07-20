defmodule Fog.Data.VendorAgentInvite do
  use Fog.Data
  alias Fog.Data.{Vendor, Agent}

  @derive {Jason.Encoder, only: [:invite_id, :vendor, :from_agent, :email, :code, :role]}

  @primary_key false
  schema "vendor_agent_invite" do
    belongs_to(:vendor, Vendor, primary_key: true, type: Fog.Types.VendorId)
    field(:email, :string, primary_key: true)
    # code is visible to people who were invited, but invisible to others
    field(:code, :string, primary_key: true)
    # invite_id is visible to everyone
    field(:invite_id, Fog.Types.InviteId)
    field(:deleted_at, :utc_datetime_usec)
    field(:role, :string)
    belongs_to(:from_agent, Agent, type: Fog.Types.AgentId)

    timestamps()
  end

  def changeset(invite, params \\ %{}) do
    invite
    |> cast(params, [:vendor_id, :email, :code, :from_agent_id, :invite_id, :deleted_at, :role])
    |> validate_required([:vendor_id, :email, :code, :from_agent_id, :role])
    # you can set other roles only to someone who is already accepted the invite
    |> validate_inclusion(:role, ["admin", "agent", "reader"])
    |> validate_format(:email, ~r/@/)
    |> unique_constraint(:invite_id)
  end
end
