defmodule Fog.Data.MessageLink do
  use Fog.Data
  alias Fog.Data.{Message, Room}

  @derive {Jason.Encoder, only: [:source_message_id, :target_message_id, :target_room_id, :type]}
  schema "message_link" do
    belongs_to(:source_message, Message, type: Fog.Types.MessageId)
    belongs_to(:target_message, Message, type: Fog.Types.MessageId)
    belongs_to(:target_room, Room, type: Fog.Types.RoomId)
    field(:type, :string)
  end

  def changeset(message_link, params \\ %{}) do
    message_link
    |> cast(params, [
      :source_message_id,
      :target_message_id,
      :target_room_id,
      :type
    ])
    # if :target_message_id is validated, it fails in message/cast_assoc
    |> validate_required([:source_message_id, :target_room_id, :type])
    |> validate_inclusion(:type, ["forward", "reply"])
  end
end
