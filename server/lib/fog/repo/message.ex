defmodule Fog.Repo.Message do
  import Ecto.Query, only: [from: 2, order_by: 2]

  alias Fog.{Data, Repo}

  def get(id), do: Data.Message |> Repo.get(id)

  def get(id, f) when is_atom(f) do
    from(r in Data.Message,
      select: field(r, ^f),
      where: r.id == ^id
    )
    |> Repo.one()
  end

  def author(id) do
    from(m in Data.Message,
      where: m.id == ^id,
      select: [m.from_user_id, m.from_agent_id]
    )
    |> Repo.one()
    |> Fog.Utils.coalesce()
  end

  def sources(message_ids) when is_list(message_ids) do
    from(m in Data.Message,
      join:
        s in fragment(
          """
          (WITH RECURSIVE sources (target_message_id, source_message_id, level, path) AS (
            SELECT target_message_id, source_message_id, 1, source_message_id :: TEXT
            FROM message_link
            WHERE target_message_id = ANY(?)
          UNION ALL
            SELECT
              s.target_message_id,
              l.source_message_id,
              s.level + 1,
              s.path || '-' || l.source_message_id :: TEXT
            FROM sources s
              JOIN message_link l
              ON s.source_message_id = l.target_message_id and l.type = 'forward'
          ) select * from sources)
          """,
          ^Enum.map(message_ids, &Fog.Types.MessageId.dump!/1)
        ),
      on: s.source_message_id == m.id,
      where: is_nil(m.link_type) or m.link_type == "reply",
      select: {type(s.target_message_id, Fog.Types.MessageId), m},
      order_by: s.path
    )
    |> Repo.all()
  end

  def targets(message_ids) when is_list(message_ids) do
    from(m in Data.Message,
      join:
        s in fragment(
          """
          (WITH RECURSIVE sources (source_message_id, target_message_id, level, path, type) AS (
            SELECT source_message_id, target_message_id, 1, target_message_id :: TEXT, type
            FROM message_link
            WHERE source_message_id = ANY(?)
          UNION ALL
            SELECT
              s.source_message_id,
              l.target_message_id,
              s.level + 1,
              s.path || '-' || l.target_message_id :: TEXT,
              l.type
            FROM sources s
              JOIN message_link l
              ON s.target_message_id = l.source_message_id and s.type = 'forward'
          ) select * from sources)
          """,
          ^Enum.map(message_ids, &Fog.Types.MessageId.dump!/1)
        ),
      on: s.target_message_id == m.id,
      select: {type(s.source_message_id, Fog.Types.MessageId), m},
      order_by: s.path
    )
    |> Repo.all()
  end

  def create(
        room_id,
        text,
        client_id,
        file_ids,
        link_room_id,
        link_start_message_id,
        link_end_message_id,
        link_type,
        mentions,
        from_user_id,
        from_agent_id,
        from_name_override,
        from_image_url_override,
        source
      ) do
    sources =
      case {is_binary(link_start_message_id), is_binary(link_end_message_id),
            is_binary(link_type)} do
        {true, true, true} ->
          from(
            m in Fog.Data.Message,
            where:
              m.room_id == ^link_room_id and m.id >= ^link_start_message_id and
                m.id <= ^link_end_message_id
          )
          |> Fog.Repo.all()

        _ ->
          []
      end

    link_sources =
      sources
      |> Enum.map(
        &%{
          source_message_id: &1.id,
          target_room_id: room_id,
          type: link_type
        }
      )

    message_files =
      case file_ids do
        nil ->
          []

        file_ids when is_list(file_ids) ->
          file_ids |> Enum.map(&%{file_id: &1})
      end

    # create target; this will also create message_link objects in one transaction
    message =
      create(
        room_id: room_id,
        from_user_id: from_user_id,
        from_agent_id: from_agent_id,
        text: text,
        client_id: client_id,
        link_room_id: link_room_id,
        link_start_message_id: link_start_message_id,
        link_end_message_id: link_end_message_id,
        link_type: link_type,
        links_to: link_sources,
        mentions: mentions,
        message_files: message_files,
        from_name_override: from_name_override,
        from_image_url_override: from_image_url_override,
        source: source
      )

    # "update" sources
    sources
    |> Enum.map(&Fog.Repo.Message.touch(&1.id))

    {:ok, _} =
      Fog.Repo.Seen.set(
        room_id,
        from_user_id,
        from_agent_id,
        message.id
      )

    {:ok, message, sources}
  end

  def create(params) do
    Data.Message.new(params)
    |> Repo.insert!()
  end

  def update(id, params) do
    message = Data.Message |> Repo.get(id)
    update_message(message, params)
  end

  def update_message(message, params) do
    params =
      case params[:file_ids] do
        nil ->
          params

        file_ids ->
          message_files = file_ids |> Enum.map(&%{message_id: message.id, file_id: &1})
          params ++ [message_files: message_files]
      end

    message
    |> Repo.preload_for_param(params, :mentions)
    |> Repo.preload_for_param(params, :links_to)
    |> Repo.preload(:message_files)
    |> Data.Message.update(params)
    |> Repo.update!()
  end

  def touch(id) do
    update(id, updated_at: DateTime.utc_now())
  end

  def delete(id) do
    Data.Message
    |> Repo.get(id)
    |> Repo.delete!()
  end

  def messages_younger_than(room_id: room_id, hours: hours) do
    from(m in Data.Message,
      where: m.room_id == ^room_id and is_nil(m.deleted_at),
      where: m.inserted_at > ago(^hours, "hour")
    )
    |> order_by(desc: :inserted_at)
    |> Repo.all()
  end

  def messages_from_agent(room_id: room_id, agent_id: agent_id, preload: preload, limit: limit) do
    from(m in Data.Message,
      join: f in assoc(m, :message_files),
      on: not is_nil(f),
      where: m.room_id == ^room_id and is_nil(m.deleted_at),
      where: m.from_agent_id == ^agent_id,
      limit: ^limit,
      preload: ^preload
    )
    |> order_by(desc: :inserted_at)
    |> Repo.all()
  end
end
