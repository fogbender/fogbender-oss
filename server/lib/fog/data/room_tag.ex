defmodule Fog.Data.RoomTag do
  use Fog.Data
  alias Fog.Data.{Agent, Room, Tag, User}

  schema "room_tag" do
    belongs_to(:room, Room, type: Fog.Types.RoomId)
    belongs_to(:tag, Tag, type: Fog.Types.TagId)

    belongs_to(:updated_by_user, User, type: Fog.Types.UserId)
    belongs_to(:updated_by_agent, Agent, type: Fog.Types.AgentId)

    timestamps()
  end

  def changeset(room_tag, params \\ %{}) do
    room_tag
    |> cast(params, [
      :id,
      :room_id,
      :tag_id,
      :inserted_at,
      :updated_at,
      :updated_by_agent_id,
      :updated_by_user_id
    ])
    |> unique_constraint([:room_id, :tag_id], name: :room_tag_room_id_tag_id_index)
  end
end
