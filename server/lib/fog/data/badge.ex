defmodule Fog.Data.Badge do
  use Fog.Data
  alias Fog.Data.{Message, User, Agent, Room, Vendor, Workspace, EmailDigest}

  embedded_schema do
    belongs_to(:agent, Agent)
    belongs_to(:user, User)

    belongs_to(:vendor, Vendor)
    belongs_to(:workspace, Workspace)
    belongs_to(:room, Room)

    field(:first_unread_message_id, Fog.Types.MessageId)
    field(:last_room_message_id, Fog.Types.MessageId)
    field(:count, :integer)
    field(:updated_at, :utc_datetime_usec)
    field(:mentions_count, :integer)
    field(:next_mention_message_id, Fog.Types.MessageId)
    # 0 - not | 1 - auto | 2 - manual
    field(:following, :integer)

    has_one(:first_unread_message, Message,
      references: :first_unread_message_id,
      foreign_key: :id
    )

    has_one(:last_room_message, Message, references: :last_room_message_id, foreign_key: :id)

    has_one(:next_mention_message, Message,
      references: :next_mention_message_id,
      foreign_key: :id
    )

    # needed for EmailDigest struct
    belongs_to(:email_digest, EmailDigest)
  end

  def changeset(badge, _params \\ %{}) do
    badge
  end
end
