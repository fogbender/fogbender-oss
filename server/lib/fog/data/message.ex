defmodule Fog.Data.Message do
  use Fog.Data
  alias Fog.Data.{Room, User, Agent, Message, MessageFile, MessageLink, Mention, MessageReaction}

  @derive {Jason.Encoder, only: [:id, :text]}
  @primary_key {:id, Fog.Types.MessageId, autogenerate: true}
  schema "message" do
    belongs_to(:room, Room, type: Fog.Types.RoomId)
    belongs_to(:from_user, User, type: Fog.Types.UserId)
    belongs_to(:from_agent, Agent, type: Fog.Types.AgentId)
    field(:client_id, :string)
    field(:text, :string)
    has_one(:customer, through: [:room, :customer])
    has_one(:workspace, through: [:room, :workspace])
    has_one(:vendor, through: [:room, :vendor])
    has_one(:helpdesk, through: [:room, :helpdesk])

    has_many(:links_from, MessageLink, foreign_key: :source_message_id, on_replace: :delete)
    has_many(:links_to, MessageLink, foreign_key: :target_message_id, on_replace: :delete)

    many_to_many(:sources, Message,
      join_through: MessageLink,
      join_keys: [target_message_id: :id, source_message_id: :id]
    )

    many_to_many(:targets, Message,
      join_through: MessageLink,
      join_keys: [source_message_id: :id, target_message_id: :id]
    )

    belongs_to(:link_room, Room, type: Fog.Types.RoomId)
    belongs_to(:link_start_message, Message, type: Fog.Types.MessageId)
    belongs_to(:link_end_message, Message, type: Fog.Types.MessageId)
    field(:link_type)

    has_many(:message_files, MessageFile, on_replace: :delete)
    has_many(:files, through: [:message_files, :file])

    has_many(:reactions, MessageReaction)

    belongs_to(:deleted_by_user, User, type: Fog.Types.UserId)
    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    belongs_to(:edited_by_user, User, type: Fog.Types.UserId)
    belongs_to(:edited_by_agent, Agent, type: Fog.Types.AgentId)
    field(:edited_at, :utc_datetime_usec)

    has_many(:mentions, Mention, on_replace: :delete)

    field(:from_name_override, :string)
    field(:from_image_url_override, :string)

    field(:source, :string)

    timestamps()
  end

  def changeset(message, params \\ %{}) do
    message
    |> cast(
      params,
      # TODO not sure about the '++ if'
      [
        :id,
        :room_id,
        :from_user_id,
        :from_agent_id,
        :client_id,
        :link_room_id,
        :link_start_message_id,
        :link_end_message_id,
        :link_type,
        :deleted_by_user_id,
        :deleted_by_agent_id,
        :deleted_at,
        :edited_by_user_id,
        :edited_by_agent_id,
        :edited_at,
        :updated_at,
        :from_name_override,
        :from_image_url_override,
        :source
      ] ++ if(is_nil(message.text) or not is_nil(params[:text]), do: [:text], else: []),
      empty_values: []
    )
    |> validate_author()
    |> validate_deleted()
    |> validate_edited()
    |> validate_link()
    |> validate_inclusion(:link_type, ["forward", "reply"])
    |> cast_assoc(:links_to)
    |> cast_assoc(:mentions)
    |> cast_assoc(:message_files)
    |> validate_text()
  end

  defp validate_text(changeset) do
    text = get_field(changeset, :text)

    message_files = get_field(changeset, :message_files)

    cond do
      length(message_files) == 0 and is_nil(text) ->
        add_error(changeset, :text, "empty_text_without_files")

      length(message_files) == 0 and text == "" ->
        add_error(changeset, :text, "empty_text_without_files")

      true ->
        changeset
    end
  end

  defp validate_author(changeset) do
    user = get_field(changeset, :from_user_id)
    agent = get_field(changeset, :from_agent_id)

    cond do
      user == nil && agent == nil ->
        add_error(changeset, :from_user_id, "author can't be empty")

      user != nil && agent != nil ->
        add_error(changeset, :from_user_id, "author cannot be both agent and user")

      true ->
        changeset
    end
  end

  defp validate_deleted(changeset) do
    user = get_field(changeset, :deleted_by_user_id)
    agent = get_field(changeset, :deleted_by_agent_id)
    deleted_at = get_field(changeset, :deleted_at)

    cond do
      user != nil && agent != nil ->
        add_error(changeset, :deleted_by_user_id, "deleted by cannot be both agent and user")
        add_error(changeset, :deleted_by_agent_id, "deleted by cannot be both agent and user")

      user != nil && deleted_at == nil ->
        add_error(changeset, :deleted_by_user_id, "deleted_at required but missing")

      agent != nil && deleted_at == nil ->
        add_error(changeset, :deleted_by_agent_id, "deleted_at required but missing")

      deleted_at != nil && agent == nil && user == nil ->
        add_error(
          changeset,
          :deleted_at,
          "deleted_by_user_id or deleted_by_agent_id required but missing"
        )

      true ->
        changeset
    end
  end

  defp validate_edited(changeset) do
    user = get_field(changeset, :edited_by_user_id)
    agent = get_field(changeset, :edited_by_agent_id)
    edited_at = get_field(changeset, :edited_at)

    cond do
      user != nil && agent != nil ->
        add_error(changeset, :edited_by_user_id, "edited by cannot be both agent and user")
        add_error(changeset, :edited_by_agent_id, "edited by cannot be both agent and user")

      user != nil && edited_at == nil ->
        add_error(changeset, :edited_by_user_id, "edited_at required but missing")

      agent != nil && edited_at == nil ->
        add_error(changeset, :edited_by_agent_id, "edited_at required but missing")

      edited_at != nil && agent == nil && user == nil ->
        add_error(
          changeset,
          :edited_at,
          "edited_by_user_id or edited_by_agent_id required but missing"
        )

      true ->
        changeset
    end
  end

  defp validate_link(changeset) do
    link_fields = [
      :link_room_id,
      :link_start_message_id,
      :link_end_message_id,
      :link_type
    ]

    link_values = Enum.map(link_fields, &get_field(changeset, &1))

    if Enum.all?(link_values) || !Enum.any?(link_values) do
      changeset
    else
      Enum.reduce(
        link_fields,
        changeset,
        &add_error(&2, &1, "Link fields should be all nil or non nil")
      )
    end
  end
end
