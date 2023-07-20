defmodule Fog.Data.SlackAgentMapping do
  use Fog.Data

  @primary_key false
  schema "slack_agent_mapping" do
    field(:agent_id, Fog.Types.AgentId)
    field(:slack_team_id, :string)
    field(:slack_user_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:agent_id, :slack_team_id, :slack_user_id])
    |> validate_required([:agent_id, :slack_team_id, :slack_user_id])
  end
end
