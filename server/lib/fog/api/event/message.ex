defmodule Fog.Api.Event.Message do
  alias Fog.{Repo, Data, PubSub, Utils, Api.Event, Format}
  alias Fog.Repo.Query
  alias Fog.Api.Event.Message

  use Fog.StructAccess

  defstruct [
    :msgType,
    :msgId,
    :id,
    :clientId,
    :vendorId,
    :workspaceId,
    :helpdeskId,
    :customerId,
    :fromType,
    :fromId,
    :fromName,
    :fromAvatarUrl,
    :fromNameOverride,
    :fromAvatarUrlOverride,
    :roomId,
    :text,
    :rawText,
    :plainText,
    :files,
    :linkRoomId,
    :linkStartMessageId,
    :linkEndMessageId,
    :linkType,
    :targets,
    :sources,
    :deletedByType,
    :deletedById,
    :deletedByName,
    :editedByType,
    :editedById,
    :editedByName,
    :mentions,
    :reactions,
    # vvv timestamps vvv
    :updatedTs,
    :createdTs,
    :deletedTs,
    :editedTs
  ]

  def preload(q) do
    q
    |> preload_base()
    |> Repo.preload(mentions: [:user, :agent])
    |> Repo.preload(reactions: [:user, :agent])
    |> Repo.preload(targets: preload_base())
    |> Repo.preload(sources: &preload_sources/1)
  end

  def preload_base(q) do
    Repo.preload(q, preload_base())
  end

  def preload_base() do
    [
      :helpdesk,
      :workspace,
      :from_user,
      :from_agent,
      :deleted_by_user,
      :deleted_by_agent,
      :edited_by_user,
      :edited_by_agent,
      :files
    ]
  end

  def preload_sources(message_ids) do
    {parent_ids, sources} =
      Repo.Message.sources(message_ids)
      |> Enum.unzip()

    sources = preload_base(sources)
    Enum.zip(parent_ids, sources)
  end

  def load_inserted(ctx, %{aroundId: messageId} = opts, _sess) when is_binary(messageId) do
    r1 =
      Data.Message
      |> Query.with_ctx(ctx)
      |> Query.aroundBefore(opts)
      |> Repo.all()
      |> preload()

    r2 =
      Data.Message
      |> Query.with_ctx(ctx)
      |> Query.aroundAfter(opts)
      |> Repo.all()
      |> preload()

    Enum.concat(r1, r2)
    |> Enum.map(&from_data/1)
    |> Enum.sort(&(&1.id >= &2.id))
  end

  def load_inserted(ctx, opts, _sess) do
    Data.Message
    |> Query.with_ctx(ctx)
    |> Query.inserted(opts)
    |> Repo.all()
    |> preload()
    |> Enum.map(&from_data/1)
  end

  def load_updated(ctx, opts, _sess) do
    Data.Message
    |> Query.with_ctx(ctx)
    |> Query.updated(opts)
    |> Repo.all()
    |> preload()
    |> Enum.map(&from_data/1)
  end

  def publish(%Data.Message{} = m) do
    m = preload(m)
    e = from_data(m)

    :ok = Fog.Notify.Badge.schedule(e)

    for t <- topics(m), do: PubSub.publish(t, e)
    Event.Room.publish(m)
    :ok
  end

  defp topics(%Data.Message{} = m) do
    [
      "room/#{m.room_id}/messages"
    ]
  end

  def from_data(%Data.Message{} = m, opts \\ []) do
    deletedTs = (m.deleted_at && m.deleted_at |> Utils.to_unix()) || nil
    deletedByType = (m.deleted_by_user_id && "user") || (m.deleted_by_agent_id && "agent") || nil
    deletedById = m.deleted_by_user_id || m.deleted_by_agent_id

    deletedByName =
      case {m.deleted_by_user, m.deleted_by_agent} do
        {%Data.User{}, _} ->
          m.deleted_by_user.name

        {_, %Data.Agent{}} ->
          m.deleted_by_agent.name

        _ ->
          nil
      end

    editedTs = (m.edited_at && m.edited_at |> Utils.to_unix()) || nil
    editedByType = (m.edited_by_user_id && "user") || (m.edited_by_agent_id && "agent") || nil
    editedById = m.edited_by_user_id || m.edited_by_agent_id

    editedByName =
      case {m.edited_by_user, m.edited_by_agent} do
        {%Data.User{}, _} ->
          m.edited_by_user.name

        {_, %Data.Agent{}} ->
          m.edited_by_agent.name

        _ ->
          nil
      end

    textFields =
      cond do
        not is_nil(deletedTs) ->
          t = "Deleted by #{deletedByName}"
          %{text: t, rawText: t, plainText: t}

        opts[:without_parsing] ->
          t = m.text
          %{text: t, rawText: t, plainText: t}

        true ->
          mentions = mentions_names(m.mentions)
          parsed = Format.Md.parse(m.text)

          html =
            parsed
            |> Format.parse_mentions(mentions)
            |> Format.Html.render()

          plain =
            parsed
            |> Format.Plain.render()

          %{text: html, rawText: m.text, plainText: plain}
      end

    %Message{
      id: m.id,
      clientId: m.client_id,
      vendorId: m.workspace.vendor_id,
      workspaceId: m.workspace.id,
      helpdeskId: m.helpdesk.id,
      customerId: m.helpdesk.customer_id,
      fromType:
        (m.from_user_id && "user") || (m.from_agent && m.from_agent.is_bot && "app") || "agent",
      fromId: m.from_user_id || m.from_agent_id,
      fromName: (m.from_user && m.from_user.name) || (m.from_agent && m.from_agent.name),
      fromNameOverride: m.from_name_override,
      fromAvatarUrl:
        (m.from_agent && m.from_agent.image_url) || (m.from_user && m.from_user.image_url),
      fromAvatarUrlOverride: m.from_image_url_override,
      roomId: m.room_id,
      updatedTs: m.updated_at |> Utils.to_unix(),
      createdTs: m.inserted_at |> Utils.to_unix(),
      files:
        case m.files do
          files when is_list(files) and is_nil(deletedTs) ->
            for(
              f <- files,
              do: Fog.Api.File.file_to_file_info(f)
            )
            |> Enum.filter(&(&1 != nil))

          _ ->
            []
        end,
      linkRoomId: m.link_room_id,
      linkStartMessageId: m.link_start_message_id,
      linkEndMessageId: m.link_end_message_id,
      linkType: m.link_type,
      targets: if(is_list(m.targets), do: Enum.map(m.targets, &from_data/1), else: []),
      sources: if(is_list(m.sources), do: Enum.map(m.sources, &from_data/1), else: []),
      deletedByType: deletedByType,
      deletedById: deletedById,
      deletedByName: deletedByName,
      deletedTs: deletedTs,
      editedByType: editedByType,
      editedById: editedById,
      editedByName: editedByName,
      editedTs: editedTs,
      mentions: mentions_from_data(m.mentions),
      reactions: reactions_from_data(m.reactions)
    }
    |> Map.merge(textFields)
  end

  defp mentions_names(mentions) when is_list(mentions) do
    Enum.map(mentions, & &1.text)
  end

  defp mentions_names(_), do: []

  defp mentions_from_data(mentions) when is_list(mentions) do
    mentions
    |> Enum.map(fn
      %Data.Mention{user: nil, agent: agent, text: text} when not is_nil(agent) ->
        %{id: agent.id, name: agent.name, type: "agent", text: text}

      %Data.Mention{agent: nil, user: user, text: text} when not is_nil(user) ->
        %{id: user.id, name: user.name, type: "user", text: text}

      _ ->
        []
    end)
    |> List.flatten()
  end

  defp mentions_from_data(_), do: []

  defp reactions_from_data(reactions) when is_list(reactions) do
    reactions
    |> Enum.map(fn
      %Data.MessageReaction{agent: nil, user: user, reaction: reaction} ->
        %{
          fromid: user.id,
          fromName: user.name,
          fromType: "user",
          updatedTs: :utc_datetime_usec,
          reaction: reaction
        }

      %Data.MessageReaction{user: nil, agent: agent, reaction: reaction} ->
        %{
          fromid: agent.id,
          fromName: agent.name,
          fromType: "agent",
          updatedTs: DateTime.utc_now(),
          reaction: reaction
        }
    end)
  end

  defp reactions_from_data(_), do: []
end
