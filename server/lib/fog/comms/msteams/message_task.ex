defmodule Fog.Comms.MsTeams.MessageTask do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Api, Data, MsTeams, Repo, Utils}
  alias Fog.Comms.{MsTeams}

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(cmd, message, room, sess) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [cmd, message, room, sess])

    :ok
  end

  def schedule(cmd, message, sess) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [cmd, message, sess])

    :ok
  end

  def run(
        %Api.Message.Create{fromApp: from_app} = cmd,
        %Data.Message{} = message,
        %Data.Room{helpdesk_id: helpdesk_id, type: type} = room,
        sess
      )
      when from_app !== "msteams" and type in ["public"] do
    workspace_integration = get_msteams_workspace_integration(helpdesk_id)

    case try_handle_command({cmd, message, workspace_integration, sess}) do
      :ok ->
        :ok

      :not_found ->
        case get_msteams_helpdesk_integration(helpdesk_id) do
          nil ->
            :ok

          helpdesk_integration ->
            try_handle_message({message, room, helpdesk_integration, sess})
            :ok
        end
    end
  end

  def run(_, _, _, _), do: :ok

  # 'text: nil' means 'delete'
  def run(
        %Api.Message.Update{fromApp: from_app, text: nil} = _cmd,
        %Data.Message{id: message_id} = message,
        sess
      )
      when from_app !== "msteams" do
    is_owner = is_message_owner(message, sess)

    case {is_owner, Repo.MsTeamsMessageMapping.msteams_messages(message_id)} do
      {_, nil} ->
        :ok

      {false, _} ->
        :ok

      {true, mappings} ->
        message = message |> Repo.preload(:helpdesk)
        helpdesk_integration = get_msteams_helpdesk_integration(message.helpdesk.id)

        case helpdesk_integration do
          %Data.HelpdeskIntegration{} ->
            mappings
            |> Enum.each(fn
              %Data.MsTeamsMessageMapping{
                msteams_channel_id: msteams_channel_id,
                msteams_message_id: msteams_message_id
              } ->
                {:ok, _} =
                  MsTeams.Api.delete_message(
                    msteams_channel_id,
                    msteams_message_id
                  )
            end)

          _ ->
            :ok
        end
    end
  end

  def run(
        %Api.Message.Update{fromApp: from_app} = _cmd,
        %Data.Message{id: message_id} = message,
        sess
      )
      when from_app !== "msteams" do
    is_owner = is_message_owner(message, sess)

    case {is_owner, Repo.MsTeamsMessageMapping.msteams_messages(message_id)} do
      {_, nil} ->
        :ok

      {false, _} ->
        :ok

      {true, mappings} ->
        message = message |> Repo.preload(:helpdesk)
        helpdesk_integration = get_msteams_helpdesk_integration(message.helpdesk.id)

        case helpdesk_integration do
          %Data.HelpdeskIntegration{helpdesk_id: helpdesk_id} ->
            mappings
            |> Enum.each(fn
              %Data.MsTeamsMessageMapping{msteams_message_meta: %{"is_file" => true}} ->
                :ok

              %Data.MsTeamsMessageMapping{
                msteams_channel_id: msteams_channel_id,
                msteams_message_id: msteams_message_id,
                msteams_message_meta: msteams_message_meta
              } ->
                text = text_with_author(message, helpdesk_id, message.text, sess)

                {text, format} =
                  case message.files do
                    files when is_list(files) and length(files) > 0 ->
                      %{"shareables" => shareables} = msteams_message_meta

                      urls = shareables |> Enum.map(&"[#{&1["name"]}](#{&1["url"]})\r\r")

                      {"#{text}\r\r#{urls}", "markdown"}

                    _ ->
                      {text, "markdown"}
                  end

                {:ok, _} =
                  MsTeams.Api.update_message(
                    msteams_channel_id,
                    msteams_message_id,
                    text,
                    format
                  )
            end)

          _ ->
            :ok
        end
    end
  end

  def run(_, _, _), do: :ok

  def try_handle_message({message, room, %Data.HelpdeskIntegration{} = integration, sess}) do
    %{
      "linked_channel_id" => linked_channel_id,
      "triage_conversation_id" => triage_conversation_id,
      "tenant_id" => tenant_id,
      "team_aad_group_id" => team_aad_group_id
    } = integration.specifics

    case Repo.MsTeamsChannelMapping.conversation_id(linked_channel_id, room.id) do
      nil ->
        tag_names = room.tags |> Enum.map(& &1.tag.name)

        room_type =
          cond do
            ":feature" in tag_names ->
              "feature request"

            ":bug" in tag_names ->
              "bug"

            true ->
              "discussion"
          end

        # Create new conversation
        room_name_text = "**New #{room_type}: #{room.name}**"

        {:ok, %{"id" => new_conversation_id}} =
          MsTeams.Api.post_message(linked_channel_id, room_name_text, "markdown")

        conversation_id = "#{linked_channel_id};messageid=#{new_conversation_id}"

        message.sources
        |> Enum.each(fn source_message ->
          source_message = source_message |> Repo.preload([:helpdesk, :files])

          :ok =
            post_message(
              tenant_id,
              team_aad_group_id,
              linked_channel_id,
              conversation_id,
              source_message,
              sess
            )
        end)

        # Post new room name and conversation link to Triage conversation:
        triage_text =
          "#{room_name_text} created. Click here to follow: [#{room_name_text}](https://teams.microsoft.com/l/message/#{linked_channel_id}/#{new_conversation_id}?tenantId=#{tenant_id})"

        conversation_id = "#{linked_channel_id};messageid=#{triage_conversation_id}"

        {:ok, _} = MsTeams.Api.post_message(conversation_id, triage_text, "markdown")

        %Data.MsTeamsChannelMapping{} =
          Repo.MsTeamsChannelMapping.create(
            room_id: room.id,
            channel_id: linked_channel_id,
            conversation_id: new_conversation_id
          )

        :ok

      conversation_id ->
        conversation_id = "#{linked_channel_id};messageid=#{conversation_id}"

        :ok =
          post_message(
            tenant_id,
            team_aad_group_id,
            linked_channel_id,
            conversation_id,
            message,
            sess
          )
    end
  end

  def try_handle_message(_), do: :not_found

  def is_message_owner(%Data.Message{from_agent_id: agent_id}, %Api.Session.Agent{
        agentId: agent_id
      }),
      do: true

  def is_message_owner(%Data.Message{from_user_id: user_id}, %Api.Session.User{userId: user_id}),
    do: true

  def is_message_owner(_, _), do: false

  def try_handle_command({cmd, message, %Data.WorkspaceIntegration{} = integration, _sess}) do
    integration = integration |> Repo.preload(workspace: :vendor)
    workspace = integration.workspace
    %Data.Message{mentions: mentions} = message

    integration_tag_name = ":msteams:MSTC-#{workspace.vendor_id}"
    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)

    mention =
      mentions
      |> Enum.find(fn %Data.Mention{agent_id: agent_id} -> agent_id === bot_agent.id end)

    try_handle_mention({mention, cmd, message, integration, bot_agent})
  end

  def try_handle_command(_), do: :not_found

  def try_handle_mention(
        {%Data.Mention{}, _cmd, %Data.Message{room_id: room_id, text: text}, integration,
         bot_agent}
      ) do
    vendor = integration.workspace.vendor
    room = Repo.Room.get(room_id) |> Repo.preload(helpdesk: :customer)
    bot_agent_sess = Api.Session.for_agent(vendor.id, bot_agent.id) |> Api.init()

    text = text |> String.trim()

    case {room.is_triage, text} do
      {_, "@Microsoft Teams disconnect"} ->
        case Repo.HelpdeskIntegration.get(room.helpdesk.id, "msteams") do
          nil ->
            cmd = %Api.Message.Create{
              roomId: room_id,
              text: "Not connected",
              fromApp: "msteams"
            }

            {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

            :ok

          helpdesk_integration ->
            :ok = MsTeams.Hook.delete_integration(helpdesk_integration)

            cmd = %Api.Message.Create{
              roomId: room_id,
              text: "Disconnected",
              fromApp: "msteams"
            }

            {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

            :ok
        end

      {_, "@Microsoft Teams status"} ->
        case Repo.HelpdeskIntegration.get(room.helpdesk.id, "msteams") do
          nil ->
            cmd = %Api.Message.Create{
              roomId: room_id,
              text: "Not connected",
              fromApp: "msteams"
            }

            {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

            :ok

          %Data.HelpdeskIntegration{} ->
            cmd = %Api.Message.Create{
              roomId: room_id,
              text: "Connected to #{room.helpdesk.customer.name} on Microsoft Teams",
              fromApp: "msteams"
            }

            {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

            :ok
        end

      {true, "@Microsoft Teams init"} ->
        case Repo.HelpdeskIntegration.get(room.helpdesk.id, "msteams") do
          nil ->
            customer = room.helpdesk.customer
            {:ok, code} = Repo.ConnectCode.create_connect_code(room.helpdesk_id)

            cmd = %Api.Message.Create{
              fromApp: "msteams",
              roomId: room_id,
              text: """
              To connect #{customer.name} to Microsoft Teams:\n\n

              1. [Add the Fogbender bot to a team](https://teams.microsoft.com/l/app/8d6f3de0-826b-4e93-a5b8-cd8929e699a5?source=app-details-dialog)
              2. Create a channel called **#{vendor.name} Support** in Teams
              3. In **#{vendor.name} Support**, mention **@Fogbender** with the following message:\n\n
              `connect #{code}`
              """
            }

            {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

            :ok

          %Data.HelpdeskIntegration{} ->
            cmd = %Api.Message.Create{
              roomId: room_id,
              text:
                "This Triage is already connected to #{room.helpdesk.customer.name} on Microsoft Teams. To disconnect, post '@Microsoft Teams disconnect'",
              fromApp: "msteams"
            }

            {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

            :ok
        end

      {false, "@Microsoft Teams init"} ->
        cmd = %Api.Message.Create{
          fromApp: "msteams",
          roomId: room_id,
          text: "This command works in Triage rooms only"
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok

      _ ->
        cmd = %Api.Message.Create{
          fromApp: "msteams",
          roomId: room_id,
          text: "Unknown command. Known commands: 'init', 'status', 'disconnect'"
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok
    end
  end

  def try_handle_mention(_), do: :not_found

  def get_msteams_workspace_integration(helpdesk_id) do
    from(
      i in Data.WorkspaceIntegration,
      join: w in assoc(i, :workspace),
      join: h in assoc(w, :helpdesks),
      on: h.id == ^helpdesk_id and i.type == "msteams"
    )
    |> Repo.one()
  end

  def get_msteams_helpdesk_integration(helpdesk_id) do
    from(
      i in Data.HelpdeskIntegration,
      join: h in assoc(i, :helpdesk),
      on: h.id == ^helpdesk_id and i.type == "msteams"
    )
    |> Repo.one()
  end

  def text_with_author(message, helpdesk_id, text, sess) do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload(:vendor)
    author = Utils.get_author_with_overrides(message, sess)
    author_name = author |> Utils.author_name()

    agent_suffix =
      case author do
        %Data.User{} ->
          ""

        %Data.Agent{} ->
          " \(#{helpdesk.vendor.name}\)"
      end

    text = text |> String.replace("\n", "  \n")

    "**#{author_name}#{agent_suffix}**  \n#{text}"
  end

  def post_message(
        tenant_id,
        team_aad_group_id,
        linked_channel_id,
        conversation_id,
        message,
        sess
      ) do
    message = message |> Repo.preload(:files)

    shareables =
      files_to_shareables(tenant_id, team_aad_group_id, linked_channel_id, message.files)

    {text, format} =
      case shareables do
        nil ->
          {text_with_author(message, message.helpdesk.id, message.text, sess), "markdown"}

        _ ->
          txt = text_with_author(message, message.helpdesk.id, message.text, sess)
          urls = shareables |> Enum.map(&"[#{&1.name}](#{&1.url})  \n")

          {"#{txt}\r\r#{urls}", "markdown"}
      end

    text =
      case message.link_type do
        "reply" ->
          replies_to =
            message.sources
            |> Enum.map(fn source_message ->
              # source_message = source_message |> Repo.preload([:helpdesk, :files])
              author = Utils.get_author(source_message)

              "> **#{author.name}:** #{source_message.text}  \n\n"
            end)
            |> Enum.join()

          "#{replies_to}#{text}"

        _ ->
          text
      end

    :ok =
      post_msteams_message(
        message.id,
        linked_channel_id,
        conversation_id,
        text,
        format,
        shareables
      )

    attachments =
      (shareables || []) |> Enum.map(& &1.attachment) |> Enum.filter(&(not is_nil(&1)))

    case attachments do
      [] ->
        :ok

      _ ->
        :ok =
          post_msteams_message_with_attachments(
            message.id,
            linked_channel_id,
            conversation_id,
            attachments
          )
    end
  end

  def post_msteams_message(
        message_id,
        channel_id,
        conversation_id,
        text,
        format \\ "markdown",
        shareables \\ nil
      ) do
    {:ok, %{"id" => msteams_message_id}} = MsTeams.Api.post_message(conversation_id, text, format)

    msteams_message_meta =
      case shareables do
        nil ->
          nil

        _ ->
          %{shareables: shareables |> Enum.map(&%{url: &1.url, name: &1.name})}
      end

    %Data.MsTeamsMessageMapping{} =
      Repo.MsTeamsMessageMapping.create(
        message_id: message_id,
        msteams_channel_id: channel_id,
        msteams_message_id: msteams_message_id,
        msteams_message_meta: msteams_message_meta
      )

    :ok
  end

  def post_msteams_message_with_attachments(_essage_id, _hannel_id, _onversation_id, []), do: :ok

  def post_msteams_message_with_attachments(message_id, channel_id, conversation_id, [
        attachment | t
      ]) do
    {:ok, %{"id" => msteams_message_id}} =
      MsTeams.Api.post_message_with_attachments(conversation_id, [attachment])

    %Data.MsTeamsMessageMapping{} =
      Repo.MsTeamsMessageMapping.create(
        message_id: message_id,
        msteams_channel_id: channel_id,
        msteams_message_id: msteams_message_id,
        msteams_message_meta: %{
          is_file: true
        }
      )

    post_msteams_message_with_attachments(message_id, channel_id, conversation_id, t)
  end

  defp files_to_shareables(_enant_id, _eam_id, _hannel_id, []), do: nil

  defp files_to_shareables(tenant_id, team_id, channel_id, files) when is_list(files) do
    {:ok, folder_info} = MsTeams.Api.get_files_folder(tenant_id, team_id, channel_id)

    %{
      "id" => folder_id,
      "parentReference" => %{
        "driveId" => drive_id
      }
    } = folder_info

    files
    |> Enum.with_index()
    |> Enum.map(fn {file, _i} ->
      %Data.File{
        id: file_id,
        filename: filename,
        content_type: content_type,
        data: %{
          "file_s3_file_path" => file_s3_file_path
        }
      } = file

      {:ok, binary} = Api.File.get_s3_file(file_s3_file_path)

      upload_filename = "#{file_id}-#{filename}"

      {:ok, %{"uploadUrl" => upload_url}} =
        MsTeams.Api.create_upload_session(
          tenant_id,
          drive_id,
          folder_id,
          upload_filename
        )

      {:ok, %Tesla.Env{status: 201, body: upload}} =
        MsTeams.Api.upload_file(tenant_id, upload_url, binary)

      %{"id" => drive_item_id} = upload

      {:ok, %{"link" => %{"webUrl" => url}}} =
        MsTeams.Api.create_shareable_link(tenant_id, drive_id, drive_item_id)

      case file.data do
        %{"thumbnail" => %{"url" => thumbnail_url}} ->
          %{
            url: url,
            name: upload_filename,
            attachment: %{
              contentType: content_type,
              contentUrl: thumbnail_url,
              name: upload_filename
            }
          }

        _ ->
          %{
            url: url,
            name: upload_filename,
            attachment: nil
          }
      end
    end)
  end
end
