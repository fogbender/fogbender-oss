defmodule Fog.Repo.SlackChannelMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.SlackChannelMapping.new(params)
    |> Repo.insert!()
  end

  def room_id(channel_id, thread_id) do
    from(
      m in Data.SlackChannelMapping,
      where: m.thread_id == ^thread_id,
      where: m.channel_id == ^channel_id,
      select: m.room_id
    )
    |> Repo.one()
  end

  def thread_id(channel_id, room_id) do
    from(
      m in Data.SlackChannelMapping,
      where: m.room_id == ^room_id,
      where: m.channel_id == ^channel_id,
      select: m.thread_id
    )
    |> Repo.one()
  end
end
