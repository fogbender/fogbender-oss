defmodule Fog.Data.SlackChannelMapping do
  use Fog.Data

  @primary_key false
  schema "slack_channel_mapping" do
    field(:room_id, Fog.Types.RoomId)
    field(:channel_id, :string)
    field(:thread_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:room_id, :channel_id, :thread_id])
    |> validate_required([:room_id, :channel_id])
  end
end
