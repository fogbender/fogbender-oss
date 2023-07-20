defmodule Fog.Repo.MsTeamsMessageMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.MsTeamsMessageMapping.new(params)
    |> Repo.insert!(
      on_conflict: [set: [msteams_message_meta: params[:msteams_message_meta]]],
      conflict_target: [:message_id, :msteams_message_id, :msteams_channel_id]
    )
  end

  def msteams_message_id(message_id) do
    from(
      r in Data.MsTeamsMessageMapping,
      where: r.message_id == ^message_id,
      select: r.msteams_message_id
    )
    |> Repo.one()
  end

  def msteams_messages(message_id) do
    from(
      r in Data.MsTeamsMessageMapping,
      where: r.message_id == ^message_id
    )
    |> Repo.all()
  end

  def message_id(msteams_message_id, msteams_channel_id) do
    from(
      r in Data.MsTeamsMessageMapping,
      where: r.msteams_message_id == ^msteams_message_id,
      where: r.msteams_channel_id == ^msteams_channel_id,
      select: r.message_id
    )
    |> Repo.one()
  end

  def mapping(msteams_message_id, msteams_channel_id) do
    from(
      r in Data.MsTeamsMessageMapping,
      where: r.msteams_message_id == ^msteams_message_id,
      where: r.msteams_channel_id == ^msteams_channel_id
    )
    |> Repo.one()
  end
end
