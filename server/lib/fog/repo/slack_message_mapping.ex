defmodule Fog.Repo.SlackMessageMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.SlackMessageMapping.new(params)
    |> Repo.insert!()
  end

  def slack_message_ts(message_id, slack_channel_id) do
    from(
      r in Data.SlackMessageMapping,
      where: r.message_id == ^message_id,
      where: r.slack_channel_id == ^slack_channel_id,
      select: r.slack_message_ts
    )
    |> Repo.one()
  end

  def slack_message(message_id) do
    from(
      r in Data.SlackMessageMapping,
      where: r.message_id == ^message_id
    )
    |> Repo.all()
  end

  def message_id(slack_message_ts, slack_channel_id) do
    from(
      r in Data.SlackMessageMapping,
      where: r.slack_message_ts == ^slack_message_ts,
      where: r.slack_channel_id == ^slack_channel_id,
      select: r.message_id
    )
    |> Repo.one()
  end
end
