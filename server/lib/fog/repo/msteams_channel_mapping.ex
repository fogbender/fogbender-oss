defmodule Fog.Repo.MsTeamsChannelMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.MsTeamsChannelMapping.new(params)
    |> Repo.insert!(
      on_conflict: [set: [conversation_id: params[:conversation_id]]],
      conflict_target: [:channel_id, :room_id]
    )
  end

  def room_id(channel_id, conversation_id) do
    from(
      m in Data.MsTeamsChannelMapping,
      where: m.conversation_id == ^conversation_id,
      where: m.channel_id == ^channel_id,
      select: m.room_id
    )
    |> Repo.one()
  end

  def conversation_id(channel_id, room_id) do
    from(
      m in Data.MsTeamsChannelMapping,
      where: m.room_id == ^room_id,
      where: m.channel_id == ^channel_id,
      select: m.conversation_id
    )
    |> Repo.one()
  end
end
