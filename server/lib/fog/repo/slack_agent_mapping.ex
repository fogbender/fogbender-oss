defmodule Fog.Repo.SlackAgentMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.SlackAgentMapping.new(params)
    |> Repo.insert!()
  end

  def slack_user_id(agent_id, slack_team_id) do
    from(
      r in Data.SlackAgentMapping,
      where: r.agent_id == ^agent_id,
      where: r.slack_team_id == ^slack_team_id,
      select: r.slack_user_id
    )
    |> Repo.one()
  end

  def agent_id(slack_team_id, slack_user_id) do
    from(
      r in Data.SlackAgentMapping,
      where: r.slack_team_id == ^slack_team_id,
      where: r.slack_user_id == ^slack_user_id
    )
    |> Repo.one()
  end
end
