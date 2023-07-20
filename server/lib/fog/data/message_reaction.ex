defmodule Fog.Data.MessageReaction do
  use Fog.Data
  alias Fog.Data.{Message, User, Agent}

  schema "message_reaction" do
    belongs_to(:user, User, type: Fog.Types.UserId)
    belongs_to(:agent, Agent, type: Fog.Types.AgentId)
    belongs_to(:message, Message, type: Fog.Types.MessageId)
    field(:reaction, :string)

    timestamps()
  end

  def changeset(message_reaction, params \\ %{}) do
    message_reaction
    |> cast(params, [:user_id, :agent_id, :message_id, :reaction])
    |> validate_required([:message_id, :reaction])
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
