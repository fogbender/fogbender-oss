defmodule Fog.Data.MsTeamsChannelMapping do
  use Fog.Data

  @primary_key false
  schema "msteams_channel_mapping" do
    field(:room_id, Fog.Types.RoomId)
    field(:channel_id, :string)
    field(:conversation_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:room_id, :channel_id, :conversation_id])
    |> validate_required([:room_id, :channel_id])
  end
end
