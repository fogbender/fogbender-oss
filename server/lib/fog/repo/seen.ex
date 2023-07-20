defmodule Fog.Repo.Seen do
  alias Fog.{Data}
  import Ecto.Query, only: [from: 2]

  def get(room_id, user_id, agent_id) do
    from(
      s in Data.Seen,
      where: s.room_id == ^room_id and (s.user_id == ^user_id or s.agent_id == ^agent_id),
      select: %Data.Seen{}
    )
    |> Fog.Repo.all()
  end

  def set(room_id, nil, agent_id, nil) do
    message_id =
      from(
        m in Data.Message,
        where: m.room_id == ^room_id
      )
      |> Fog.Repo.aggregate(:max, :id)

    case message_id != nil do
      true ->
        Fog.Repo.insert(
          Fog.Data.Seen.new(
            room_id: room_id,
            agent_id: agent_id,
            message_id: message_id,
            is_following: true
          ),
          on_conflict: {:replace, [:message_id, :is_following]},
          conflict_target: [:room_id, :agent_id]
        )

      _ ->
        {:ok,
         %Fog.Data.Seen{
           room_id: room_id,
           agent_id: agent_id
         }}
    end
  end

  def set(room_id, user_id, nil, nil) do
    message_id =
      from(
        m in Data.Message,
        where: m.room_id == ^room_id
      )
      |> Fog.Repo.aggregate(:max, :id)

    case message_id != nil do
      true ->
        Fog.Repo.insert(
          Fog.Data.Seen.new(
            room_id: room_id,
            user_id: user_id,
            message_id: message_id,
            is_following: true
          ),
          on_conflict: {:replace, [:message_id, :is_following]},
          conflict_target: [:room_id, :user_id]
        )

      _ ->
        {:ok,
         %Fog.Data.Seen{
           room_id: room_id,
           user_id: user_id
         }}
    end
  end

  def set(room_id, nil, agent_id, message_id) do
    Fog.Repo.insert(
      Fog.Data.Seen.new(
        room_id: room_id,
        agent_id: agent_id,
        message_id: message_id,
        is_following: true
      ),
      on_conflict: {:replace, [:message_id, :is_following]},
      conflict_target: [:room_id, :agent_id]
    )
  end

  def set(room_id, user_id, nil, message_id) do
    Fog.Repo.insert(
      Fog.Data.Seen.new(
        room_id: room_id,
        user_id: user_id,
        message_id: message_id,
        is_following: true
      ),
      on_conflict: {:replace, [:message_id, :is_following]},
      conflict_target: [:room_id, :user_id]
    )
  end

  def unset(room_id, user_id, nil) do
    from(s in Data.Seen, where: s.room_id == ^room_id and s.user_id == ^user_id)
    |> Fog.Repo.update_all(set: [is_following: false])

    {:ok,
     %Fog.Data.Seen{
       room_id: room_id,
       user_id: user_id
     }}
  end

  def unset(room_id, nil, agent_id) do
    from(s in Data.Seen, where: s.room_id == ^room_id and s.agent_id == ^agent_id)
    |> Fog.Repo.update_all(set: [is_following: false])

    {:ok,
     %Fog.Data.Seen{
       room_id: room_id,
       agent_id: agent_id
     }}
  end
end
