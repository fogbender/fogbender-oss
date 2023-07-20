defmodule Fog.Data.MsTeamsMessageMapping do
  use Fog.Data

  @primary_key false
  schema "msteams_message_mapping" do
    field(:message_id, Fog.Types.MessageId)
    field(:msteams_message_id, :string)
    field(:msteams_channel_id, :string)
    field(:msteams_message_meta, :map)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [
      :message_id,
      :msteams_message_id,
      :msteams_channel_id,
      :msteams_message_meta
    ])
    |> validate_required([:message_id, :msteams_message_id, :msteams_channel_id])
  end
end
