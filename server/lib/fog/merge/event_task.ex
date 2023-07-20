defmodule Fog.Merge.EventTask do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Merge, Repo, Utils, Format, Api.Session}

  @supported_integrations ["hubspot"]

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(params) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :maybe_run, [params])

    :ok
  end

  def maybe_run(params) do
    # Don't try to ping Merge if we don't have any integrations with driver => "merge". (For tests, mainly.)

    room =
      case params |> Keyword.fetch(:room) do
        {:ok, room} ->
          room

        :error ->
          {:ok, %{roomId: room_id}} = params |> Keyword.fetch(:cmd)

          Repo.Room.get(room_id)
      end

    room = room |> Repo.preload(:workspace)

    integrations =
      from(
        e in Data.WorkspaceIntegration,
        where: json_extract_path(e.specifics, ["driver"]) == "merge",
        where: e.workspace_id == ^room.workspace.id
      )
      |> Repo.all()

    case integrations do
      [] ->
        :ok

      _ ->
        run(params ++ [integrations: integrations])
    end
  end

  def run(
        cmd: %Api.Message.Create{},
        message: %Data.Message{inserted_at: _inserted_at} = message,
        room: %Data.Room{is_triage: true} = room,
        sess: _sess,
        integrations: integrations
      ) do
    room = room |> Repo.preload([:workspace, :helpdesk])
    workspace = room.workspace
    helpdesk = room.helpdesk |> Repo.preload(:customer)
    customer = helpdesk.customer |> Repo.preload(:domains)

    integrations
    |> Enum.filter(&(&1.type in @supported_integrations))
    |> Enum.each(fn integration ->
      %{
        "account_token" => account_token,
        "remote_id" => crm_remote_id
      } = integration.specifics

      provider_type = integration.type

      case customer_crm(crm_remote_id, customer.id) do
        nil ->
          :ok

        %Data.CustomerCrm{crm_remote_account_id: crm_remote_account_id} ->
          add_note_f = fn html ->
            Merge.Api.add_note_to_company(
              provider_type,
              account_token,
              crm_remote_account_id,
              html
            )
          end

          update_note_f = fn note_id, html ->
            Merge.Api.update_note(provider_type, account_token, note_id, html)
          end

          :ok =
            create_or_update_note(
              workspace,
              room,
              message,
              crm_remote_id,
              provider_type,
              add_note_f,
              update_note_f
            )
      end
    end)

    :ok
  end

  def run(
        cmd: %Api.Message.Create{},
        message: %Data.Message{} = message,
        room: room,
        sess: _sess,
        integrations: integrations
      ) do
    room = room |> Repo.preload([:workspace, :helpdesk])
    workspace = room.workspace
    helpdesk = room.helpdesk |> Repo.preload(:customer)
    customer = helpdesk.customer |> Repo.preload(:domains)

    integrations
    |> Enum.filter(&(&1.type in @supported_integrations))
    |> Enum.each(fn integration ->
      %{
        "account_token" => account_token,
        "remote_id" => crm_remote_id
      } = integration.specifics

      provider_type = integration.type

      case customer_crm(crm_remote_id, customer.id) do
        nil ->
          :ok

        %Data.CustomerCrm{} ->
          :ok

          room.tags
          |> Enum.each(fn
            %Data.RoomTag{tag: %Data.Tag{name: ":" <> tag_name}} ->
              case tag_name |> String.split(":", parts: 3) do
                [^provider_type, ^crm_remote_id, ticket_id] ->
                  add_note_f = fn html ->
                    Merge.Api.add_note_to_ticket(provider_type, account_token, ticket_id, html)
                  end

                  update_note_f = fn note_id, html ->
                    Merge.Api.update_note(provider_type, account_token, note_id, html)
                  end

                  :ok =
                    create_or_update_note(
                      workspace,
                      room,
                      message,
                      crm_remote_id,
                      provider_type,
                      add_note_f,
                      update_note_f
                    )

                _ ->
                  :ok
              end

            _ ->
              :ok
          end)
      end
    end)

    :ok
  end

  def run(
        cmd: %Api.Room.Archive{roomId: room_id},
        sess: _sess,
        integrations: integrations
      ) do
    room = Repo.Room.get(room_id) |> Repo.preload([:workspace, :helpdesk, tags: :tag])
    helpdesk = room.helpdesk |> Repo.preload(:customer)
    customer = helpdesk.customer |> Repo.preload(:domains)

    integrations
    |> Enum.filter(&(&1.type in @supported_integrations))
    |> Enum.each(fn integration ->
      %{
        "account_token" => account_token,
        "remote_id" => crm_remote_id
      } = integration.specifics

      provider_type = integration.type

      case customer_crm(crm_remote_id, customer.id) do
        nil ->
          :ok

        %Data.CustomerCrm{} ->
          :ok

          room.tags
          |> Enum.each(fn
            %Data.RoomTag{tag: %Data.Tag{name: ":" <> tag_name}} ->
              case tag_name |> String.split(":", parts: 3) do
                [^provider_type, ^crm_remote_id, ticket_id] ->
                  {:ok, _} = Merge.Api.close_ticket(provider_type, account_token, ticket_id)

                _ ->
                  :ok
              end

            _ ->
              :ok
          end)
      end
    end)

    :ok
  end

  def run(
        cmd: %Api.Room.Unarchive{roomId: room_id},
        sess: _sess,
        integrations: integrations
      ) do
    room = Repo.Room.get(room_id) |> Repo.preload([:workspace, :helpdesk, tags: :tag])
    helpdesk = room.helpdesk |> Repo.preload(:customer)
    customer = helpdesk.customer |> Repo.preload(:domains)

    integrations
    |> Enum.filter(&(&1.type in @supported_integrations))
    |> Enum.each(fn integration ->
      %{
        "account_token" => account_token,
        "remote_id" => crm_remote_id
      } = integration.specifics

      provider_type = integration.type

      case customer_crm(crm_remote_id, customer.id) do
        nil ->
          :ok

        %Data.CustomerCrm{} ->
          :ok

          room.tags
          |> Enum.each(fn
            %Data.RoomTag{tag: %Data.Tag{name: ":" <> tag_name}} ->
              case tag_name |> String.split(":", parts: 3) do
                [^provider_type, ^crm_remote_id, ticket_id] ->
                  {:ok, _} = Merge.Api.reopen_ticket(provider_type, account_token, ticket_id)

                _ ->
                  :ok
              end

            _ ->
              :ok
          end)
      end
    end)

    :ok
  end

  def run(
        cmd: %Api.Room.Create{},
        room: %Data.Room{id: room_id, name: room_name, helpdesk_id: hid},
        message_id: message_id,
        sess: sess,
        integrations: integrations
      ) do
    helpdesk = Repo.Helpdesk.get(hid) |> Repo.preload([:customer, :workspace])
    workspace = helpdesk.workspace
    customer = helpdesk.customer

    integrations
    |> Enum.filter(&(&1.type in @supported_integrations))
    |> Enum.each(fn integration ->
      %{
        "account_token" => account_token,
        "remote_id" => crm_remote_id
      } = integration.specifics

      case customer_crm(crm_remote_id, customer.id) do
        nil ->
          :ok

        %Data.CustomerCrm{crm_remote_account_id: crm_remote_account_id} ->
          fog_room_url = Utils.room_url(workspace.vendor_id, workspace.id, room_id)

          provider_type = integration.type

          {:ok, ticket} =
            Merge.Api.create_ticket(
              provider_type,
              account_token,
              crm_remote_account_id,
              room_name,
              "",
              fog_room_url
            )

          %{"id" => ticket_id} = ticket

          ticket_tag_name = ":#{provider_type}:#{crm_remote_id}:#{ticket_id}"
          ticket_tag = Repo.Tag.create(workspace.id, ticket_tag_name)

          %Data.Room{} =
            Repo.Room.update_tags(
              room_id,
              [ticket_tag.id],
              [],
              Session.agent_id(sess),
              Session.user_id(sess)
            )

          add_note_f = fn html ->
            Merge.Api.add_note_to_ticket(provider_type, account_token, ticket_id, html)
          end

          room = Repo.Room.get(room_id)
          message = Repo.Message.get(message_id)

          :ok =
            create_or_update_note(
              workspace,
              room,
              message,
              crm_remote_id,
              provider_type,
              add_note_f,
              nil
            )
      end
    end)

    :ok
  end

  def run(_), do: :ok

  def create_or_update_note(
        workspace,
        room,
        message,
        provider_id,
        provider_type,
        add_note_f,
        update_note_f
      ) do
    %Data.Message{inserted_at: inserted_at} = message

    {bucket_duration_seconds, ""} = Integer.parse(Fog.env(:crm_note_bucket_duration_seconds))
    bucket_duration_microseconds = bucket_duration_seconds * 1_000_000

    {:ok, bucket_timestamp} =
      ((inserted_at |> Fog.Utils.to_unix() |> div(bucket_duration_microseconds)) *
         bucket_duration_microseconds)
      |> DateTime.from_unix(:microsecond)

    mapping =
      Repo.CrmNoteMapping.get_bucket(
        room_id: room.id,
        crm_id: "#{provider_id}",
        crm_type: "#{provider_type}",
        inserted_at: bucket_timestamp |> DateTime.to_iso8601()
      )

    html = bucket_to_html(workspace, room, bucket_timestamp)

    res =
      case mapping do
        %Data.CrmNoteMapping{note_id: nil} ->
          {:ok, %{"id" => note_id}} = add_note_f.(html)

          %Data.CrmNoteMapping{} = mapping |> Repo.CrmNoteMapping.update(note_id: note_id)
          :ok

        %Data.CrmNoteMapping{note_id: note_id} ->
          {:ok, note_id}
      end

    case res do
      :ok ->
        :ok

      {:ok, note_id} ->
        {:ok, _} = update_note_f.(note_id, html)
        :ok
    end
  end

  def bucket_to_html(workspace, %Data.Room{id: room_id}, from_ts) do
    {bucket_duration_seconds, ""} = Integer.parse(Fog.env(:crm_note_bucket_duration_seconds))
    to_ts = from_ts |> DateTime.add(bucket_duration_seconds, :second)

    from(m in Data.Message,
      where: m.room_id == ^room_id,
      where: m.inserted_at >= ^from_ts,
      where: m.inserted_at < ^to_ts
    )
    |> order_by(asc: :inserted_at)
    |> Repo.all()
    |> history_to_html(workspace)
  end

  def history_to_html(messages, workspace) do
    messages
    |> Repo.preload([:mentions, :files, :sources])
    |> Enum.map(fn message ->
      %Data.Message{
        id: message_id,
        room_id: room_id,
        text: text,
        mentions: mentions,
        files: files,
        inserted_at: inserted_at,
        sources: sources
      } = message

      author = Utils.get_author(message)
      message_url = Utils.message_url(workspace.vendor_id, workspace.id, room_id, message_id)

      images =
        files
        |> Enum.map(fn %Data.File{
                         filename: filename,
                         content_type: content_type,
                         data: %{"size" => size_bytes}
                       } ->
          """
            <p>
              <a href="#{message_url}" targe="_blank" rel="noopener">
                #{filename} (#{content_type}, #{size_bytes} bytes)
              </a>
            </p>
          """
        end)
        |> Enum.join()

      ts =
        inserted_at
        |> DateTime.shift_zone!("Etc/UTC")
        |> Calendar.strftime("%a, %-d %b %Y %X UTC")

      ts = """
        <a href="#{message_url}" targe="_blank" rel="noopener">#{ts}</a>
      """

      text =
        case message.link_type do
          "forward" ->
            text = parse_text(text, mentions)

            forwarded =
              sources
              |> Enum.map(fn source_message ->
                author = Utils.get_author(source_message)
                text = parse_text(source_message.text, mentions)

                "<b>#{author.name}:</b> #{text}"
              end)
              |> Enum.join()

            "#{text}<div style='margin-left: 10px; padding-left: 4px; border-left: 1px solid #ccc;'>#{forwarded}</div>"

          "reply" ->
            text = parse_text(text, mentions)

            replies_to =
              sources
              |> Enum.map(fn source_message ->
                author = Utils.get_author(source_message)
                text = parse_text(source_message.text, mentions)

                "<b>#{author.name}:</b> #{text}"
              end)
              |> Enum.join()

            "<div style='margin-left: 10px; padding-left: 4px; border-left: 1px solid #9900ff;'><span style='margin-left: 2px;'>#{replies_to}</span></div>#{text}"

          _ ->
            parse_text(text, mentions)
        end

      """
      <p>
        <b>#{author.name} (#{author.email}) on #{ts}:</b> #{text}
      </p>
      #{images}
      """
    end)
    |> Enum.join()
  end

  def note_text(helpdesk_id, message, sess) do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload(:vendor)
    author = Utils.get_author(sess)

    agent_suffix =
      case author do
        %Data.User{} ->
          ""

        %Data.Agent{} ->
          " \(#{helpdesk.vendor.name}\)"
      end

    text = note_text(message) |> String.replace("\n", "  \n")

    "#{author.name}#{agent_suffix}: \n#{text}"
  end

  def note_text(message) do
    case message.text do
      "" ->
        "Uploaded files"

      text ->
        text
    end
  end

  def customer_crm(crm_remote_id, customer_id) do
    from(
      e in Data.CustomerCrm,
      where: e.crm_remote_id == ^crm_remote_id and e.customer_id == ^customer_id
    )
    |> Repo.one()
  end

  defp parse_text(text, mentions) do
    mentions_names = Enum.map(mentions, & &1.text)

    text
    |> Format.Md.parse()
    |> Format.parse_mentions(mentions_names)
    |> Format.Html.render()
  end
end
