defmodule Fog.Repo.SlackCustomerUserMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.SlackCustomerUserMapping.new(params)
    |> Repo.insert!()
  end

  def slack_user_id(user_id, slack_team_id) do
    from(
      r in Data.SlackCustomerUserMapping,
      where: r.user_id == ^user_id,
      where: r.slack_team_id == ^slack_team_id,
      select: r.slack_user_id
    )
    |> Repo.one()
  end

  def slack_user_id_to_mapping(slack_team_id, slack_user_id, helpdesk_id) do
    from(
      r in Data.SlackCustomerUserMapping,
      where: r.slack_team_id == ^slack_team_id,
      where: r.slack_user_id == ^slack_user_id,
      where: r.helpdesk_id == ^helpdesk_id
    )
    |> Repo.one()
  end

  def user_id_to_mapping(user_id) do
    from(
      r in Data.SlackCustomerUserMapping,
      where: r.user_id == ^user_id
    )
    |> Repo.one()
  end
end
