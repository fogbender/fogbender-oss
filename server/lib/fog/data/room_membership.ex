defmodule Fog.Data.RoomMembership do
  use Fog.Data
  alias Fog.Data.{Helpdesk, Room, User, Agent}

  schema "room_membership" do
    belongs_to(:room, Room, type: Fog.Types.RoomId)
    belongs_to(:helpdesk, Helpdesk, type: Fog.Types.HelpdeskId)
    belongs_to(:agent, Agent, type: Fog.Types.AgentId)
    belongs_to(:user, User, type: Fog.Types.UserId)
    field(:role, :string)
    field(:status, :string)
  end

  def changeset(room_membership, params \\ %{}) do
    room_membership
    |> cast(params, [:id, :room_id, :helpdesk_id, :agent_id, :user_id, :role, :status])
    |> unique_constraint(:agent, name: "room_membership_helpdesk_id_room_id_agent_id_index")
    |> validate_inclusion(:role, ["admin", "member"])
    |> validate_inclusion(:status, ["invited", "active", "removed"])
  end
end
