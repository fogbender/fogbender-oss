defmodule Fog.Data.Seen do
  use Fog.Data
  alias Fog.Data.{Room, User, Agent, Message}

  schema "seen" do
    belongs_to(:room, Room, type: Fog.Types.RoomId)
    belongs_to(:user, User, type: Fog.Types.UserId)
    belongs_to(:agent, Agent, type: Fog.Types.AgentId)
    belongs_to(:message, Message, type: Fog.Types.MessageId)
    field(:is_following, :boolean, default: true)

    timestamps()
  end

  def changeset(seen, params \\ %{}) do
    seen
    |> cast(params, [:room_id, :agent_id, :user_id, :message_id, :is_following])
    |> validate_required([:room_id])
    |> validate_author()
  end

  defp validate_author(changeset) do
    user = get_field(changeset, :user_id)
    agent = get_field(changeset, :agent_id)

    cond do
      user == nil && agent == nil ->
        add_error(changeset, :user_id, "author can't be empty")

      user != nil && agent != nil ->
        add_error(changeset, :user_id, "author cannot be both agent and user")

      true ->
        changeset
    end
  end
end
