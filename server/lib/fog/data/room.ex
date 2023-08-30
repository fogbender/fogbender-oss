defmodule Fog.Data.Room do
  use Fog.Data
  alias Fog.Data.{Helpdesk, Message, Agent, RoomMembership, RoomTag, User}

  @derive {Jason.Encoder, only: [:id, :helpdesk_id, :name]}
  @primary_key {:id, Fog.Types.RoomId, autogenerate: true}
  schema "room" do
    belongs_to(:helpdesk, Helpdesk, type: Fog.Types.HelpdeskId)
    field(:name, :string)
    field(:display_name_for_user, :string)
    field(:display_name_for_agent, :string)
    field(:status, :string, default: "active")
    field(:dialog_id, :string)
    field(:type, :string)
    field(:is_triage, :boolean)
    field(:agent_groups, {:array, :string})

    belongs_to(:created_by_agent, Agent, type: Fog.Types.AgentId)
    belongs_to(:created_by_user, User, type: Fog.Types.UserId)

    field(:resolved, :boolean)
    field(:resolved_at, :utc_datetime_usec)
    field(:resolved_til, :utc_datetime_usec)
    belongs_to(:resolved_by_agent, Agent, type: Fog.Types.AgentId)

    field(:image_url, :string, virtual: true)
    field(:agent_id, :string, virtual: true)
    field(:user_id, :string, virtual: true)
    field(:email, :string, virtual: true)
    field(:created, :boolean, virtual: true)
    field(:commands, {:array, :string}, virtual: true)

    has_one(:customer, through: [:helpdesk, :customer])
    has_one(:workspace, through: [:helpdesk, :workspace])
    has_one(:vendor, through: [:workspace, :vendor])
    has_many(:messages, Message)
    has_many(:members, RoomMembership, on_replace: :delete)
    has_many(:tags, RoomTag, on_replace: :delete)

    # virtual
    field(:last_message_id, Fog.Types.MessageId, load_in_query: false)
    has_one(:last_message, Message, references: :last_message_id, foreign_key: :id)
    field(:relevance, :any, virtual: true)
    field(:relevant_message_id, Fog.Types.MessageId, load_in_query: false)
    has_one(:relevant_message, Message, references: :relevant_message_id, foreign_key: :id)

    timestamps()
  end

  def changeset(room, params \\ %{}) do
    room
    |> cast(params, [
      :id,
      :helpdesk_id,
      :name,
      :display_name_for_user,
      :display_name_for_agent,
      :status,
      :type,
      :dialog_id,
      :is_triage,
      :agent_groups,
      :resolved,
      :resolved_at,
      :resolved_til,
      :resolved_by_agent_id,
      :created_by_agent_id,
      :created_by_user_id
    ])
    |> validate_required([:name, :status, :type])
    |> validate_inclusion(:status, ["archived", "active"])
    |> validate_inclusion(:type, ["public", "private", "dialog"])
    |> validate_change(:agent_groups, fn :agent_groups, groups ->
      if Enum.uniq(groups) == groups do
        []
      else
        [agent_groups: "Must be unique"]
      end
    end)
    |> unique_constraint(:name, name: "room_helpdesk_id_name_index")
    |> unique_constraint(:is_triage, name: "room_helpdesk_id_is_triage_index")
    |> cast_assoc(:members)
    |> cast_assoc(:tags)
    |> cast_assoc(:messages)
  end
end
