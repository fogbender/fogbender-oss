defmodule Fog.Repo.MessageReaction do
  alias Fog.{Data, Repo}
  import Ecto.Query

  def get(user_id, agent_id, message_id) do
    from(
      m in Data.MessageReaction,
      where:
        m.message_id == ^message_id and
          (m.user_id == ^user_id or m.agent_id == ^agent_id),
      select: %Data.MessageReaction{}
    )
    |> Fog.Repo.all()
  end

  def set(message_id, nil, agent_id, nil) do
    Data.MessageReaction
    |> Repo.get_by(message_id: message_id, agent_id: agent_id)
    |> Repo.delete!()
  end

  def set(message_id, user_id, nil, nil) do
    Data.MessageReaction
    |> Repo.get_by(message_id: message_id, user_id: user_id)
    |> Repo.delete!()
  end

  def set(message_id, nil, agent_id, reaction) do
    Repo.insert(
      Data.MessageReaction.new(
        message_id: message_id,
        agent_id: agent_id,
        reaction: reaction
      ),
      on_conflict: {:replace, [:reaction]},
      conflict_target: [:message_id, :agent_id]
    )
  end

  def set(message_id, user_id, nil, reaction) do
    Repo.insert(
      Data.MessageReaction.new(
        message_id: message_id,
        user_id: user_id,
        reaction: reaction
      ),
      on_conflict: {:replace, [:reaction]},
      conflict_target: [:message_id, :user_id]
    )
  end
end
