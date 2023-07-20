defmodule Fog.Repo.RoomMembership do
  alias Fog.Data
  import Ecto.Query

  def with_room(room_id) do
    from(rm in Data.RoomMembership,
      where: rm.room_id == ^room_id,
      select: %Data.RoomMembership{
        room_id: rm.room_id,
        user_id: rm.user_id,
        agent_id: rm.agent_id
      },
      union: ^with_room_groups(room_id)
    )
  end

  defp with_room_groups(room_id) do
    from(r in Data.Room,
      join: v in assoc(r, :vendor),
      on: r.id == ^room_id,
      join: ag in assoc(v, :groups),
      on: ag.group in r.agent_groups,
      select: %Data.RoomMembership{room_id: r.id, user_id: nil, agent_id: ag.agent_id}
    )
  end
end
