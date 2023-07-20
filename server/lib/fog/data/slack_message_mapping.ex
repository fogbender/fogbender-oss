defmodule Fog.Data.SlackMessageMapping do
  use Fog.Data

  @primary_key false
  schema "slack_message_mapping" do
    field(:message_id, Fog.Types.MessageId)
    field(:slack_message_ts, :string)
    field(:slack_channel_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:message_id, :slack_message_ts, :slack_channel_id])
    |> validate_required([:message_id, :slack_message_ts, :slack_channel_id])
  end
end
