defmodule Fog.Data.Mention do
  use Fog.Data
  alias Fog.Data.{User, Agent, Message}

  @primary_key false
  schema "mention" do
    belongs_to(:message, Message, type: Fog.Types.MessageId, primary_key: true)
    belongs_to(:user, User, type: Fog.Types.UserId, primary_key: true)
    belongs_to(:agent, Agent, type: Fog.Types.AgentId)
    field(:text, :string)

    has_one(:room, through: [:message, :room])
    timestamps()
  end

  def changeset(mention, params \\ %{}) do
    mention
    |> cast(params, [:message_id, :agent_id, :user_id, :text])
    |> validate_author()
  end

  defp validate_author(changeset) do
    user = get_field(changeset, :user_id)
    agent = get_field(changeset, :agent_id)

    cond do
      user == nil && agent == nil ->
        add_error(changeset, :user_id, "mention can't be empty")

      user != nil && agent != nil ->
        add_error(changeset, :user_id, "mention cannot be both agent and user")

      true ->
        changeset
    end
  end
end
