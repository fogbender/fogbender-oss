defmodule Fog.Comms.Slack.Customer.Hook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Repo}
  alias Fog.Comms.{Slack, Utils}
  alias Slack.{Customer}

  use Task

  def consume(payload) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def run(data) do
    token = Fog.env(:slack_cust_verification_token)

    process_event(data, token)

    :ok
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{
             "type" => "message",
             "subtype" => "message_changed",
             "channel" => channel_id,
             "message" => %{"ts" => message_ts, "text" => text, "user" => user_id}
           }
         } = event,
         token
       )
       when t === token do
    slack_team_id = event["team_id"]

    case get_slack_helpdesk_integration(slack_team_id, channel_id) do
      nil ->
        :ok

      helpdesk_integration ->
        message_id = Repo.SlackMessageMapping.message_id(message_ts, channel_id)

        case nil in [
               channel_id,
               message_ts,
               text,
               token,
               slack_team_id,
               helpdesk_integration,
               message_id
             ] do
          true ->
            :ok

          false ->
            user = resolve_fog_user_by_slack_user_id(helpdesk_integration, user_id)
            user_sess = user_sess(helpdesk_integration, user)

            cmd = %Api.Message.Update{
              messageId: message_id,
              fromApp: "slack-customer",
              text: text
            }

            {:reply, %Api.Message.Ok{messageId: ^message_id}} = Api.Message.info(cmd, user_sess)
        end
    end
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{
             "type" => "message",
             "subtype" => "message_deleted",
             "channel" => channel_id,
             "previous_message" => %{"ts" => message_ts, "user" => user_id}
           }
         } = event,
         token
       )
       when t === token do
    slack_team_id = event["team_id"]

    case get_slack_helpdesk_integration(slack_team_id, channel_id) do
      nil ->
        :ok

      helpdesk_integration ->
        message_id = Repo.SlackMessageMapping.message_id(message_ts, channel_id)

        case nil in [
               channel_id,
               message_ts,
               token,
               slack_team_id,
               helpdesk_integration,
               message_id
             ] do
          true ->
            :ok

          false ->
            {_access_token, _email, agent, _, workspace} =
              resolve_fog_user_by_slack_user_id(helpdesk_integration, user_id)

            agent_sess = Api.Session.for_agent(workspace.vendor_id, agent.id)

            cmd = %Api.Message.Update{
              messageId: message_id,
              fromApp: "slack-customer",
              text: nil
            }

            {:reply, %Api.Message.Ok{messageId: ^message_id}} = Api.Message.info(cmd, agent_sess)
        end

        :ok
    end
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{"type" => "message", "channel" => channel_id} = event,
           "team_id" => team_id
         },
         token
       )
       when t === token do
    case event do
      %{"bot_id" => "" <> _} ->
        # ignore bot messages
        :ok

      _ ->
        case get_slack_helpdesk_integration(team_id, channel_id) do
          nil ->
            :ok

          %{helpdesk_id: helpdesk_id} = helpdesk_integration ->
            case Customer.Utils.get_slack_customer_workspace_integration(helpdesk_id) do
              nil ->
                :ok

              workspace_integration ->
                handle_slack_message(workspace_integration, helpdesk_integration, event)
            end
        end
    end
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{"type" => type} = event,
           "team_id" => team_id
         },
         token
       )
       when t === token and (type === "reaction_added" or type === "reaction_removed") do
    thread_ts = event["item"]["ts"]
    channel_id = event["item"]["channel"]

    message_id = Repo.SlackMessageMapping.message_id(thread_ts, channel_id)

    if message_id do
      %{"user" => user_id, "reaction" => reaction} = event

      case get_slack_helpdesk_integration(team_id, channel_id) do
        nil ->
          :ok

        helpdesk_integration ->
          case resolve_fog_user_by_slack_user_id(helpdesk_integration, user_id) do
            :bot ->
              :ok

            user ->
              user_sess = user_sess(helpdesk_integration, user)

              cmd = %Api.Message.SetReaction{
                fromApp: "slack-customer",
                messageId: message_id,
                reaction:
                  if type === "reaction_added" do
                    Utils.to_fog_reaction(reaction)
                  else
                    nil
                  end
              }

              {:reply, %Api.Message.Ok{}} = Api.Message.info(cmd, user_sess)
              :ok
          end
      end
    end
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{"type" => "user_profile_changed", "user" => %{"id" => user_id}},
           "team_id" => team_id
         },
         token
       )
       when t === token do
    {_, _} =
      from(
        m in Data.SlackCustomerUserMapping,
        where: m.slack_user_id == ^user_id,
        where: m.slack_team_id == ^team_id
      )
      |> Repo.delete_all()

    :ok
  end

  defp process_event(_, _) do
    :ok
  end

  defp get_slack_helpdesk_integration(nil, _), do: nil

  defp get_slack_helpdesk_integration(slack_team_id, slack_channel_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: i.type == "slack-customer",
      where: json_extract_path(i.specifics, ["team_id"]) == ^slack_team_id,
      where: json_extract_path(i.specifics, ["linked_channel_id"]) == ^slack_channel_id
    )
    |> Repo.one()
  end

  defp handle_slack_message(_workspace_integration, helpdesk_integration, data) do
    case data["subtype"] do
      subtype when is_nil(subtype) or subtype === "file_share" ->
        %{"user" => user_id} = data

        case resolve_fog_user_by_slack_user_id(helpdesk_integration, user_id) do
          :bot ->
            :ok

          %Data.User{} = user ->
            handle_message_from_author(
              user,
              data,
              # workspace_integration,
              helpdesk_integration,
              "slack-customer"
            )
        end

      _ ->
        :ok
    end
  end

  # response to a thread
  def handle_message_from_author(
        author,
        %{
          "channel" => channel_id,
          "thread_ts" => thread_ts
        } = data,
        # %Data.WorkspaceIntegration{specifics: %{"aggressive_ticketing" => aggressive_ticketing}},
        %Data.HelpdeskIntegration{specifics: %{"access_token" => access_token}} =
          helpdesk_integration,
        from_app
      ) do
    # thread reply, let's find thread root

    case Repo.SlackChannelMapping.room_id(channel_id, thread_ts) do
      nil ->
        # in aggressive ticketing OFF mode, this is a reply (new thread) to a top-level message
        # we have to treat it as a new issue, otherwise we can't keep track of it

        # we need to fetch the top-level message to name the room
        {:ok, top_level_thread} = Slack.Api.get_message(access_token, channel_id, thread_ts)

        %{"messages" => [top_level_message_data | _]} = top_level_thread

        mentioned_slack_user_ids = mentioned_slack_user_ids(top_level_message_data)

        %{"text" => text} = top_level_message_data

        text =
          case {top_level_message_data["files"], text} do
            {nil, _} ->
              text

            {[], _} ->
              text

            {_, ""} ->
              "File upload"

            {_, "[" <> _} ->
              "File upload"

            {_, _} ->
              text
          end

        {text, _mentions} =
          slack_user_ids_to_mentions(helpdesk_integration, mentioned_slack_user_ids, text)

        helpdesk =
          Repo.Helpdesk.get(helpdesk_integration.helpdesk_id)
          |> Repo.preload([:vendor, :workspace, :customer])

        workspace = Repo.Workspace.get(helpdesk.workspace.id) |> Repo.preload([:rooms])

        new_issue_title = Fog.Utils.safe_text_to_issue_title(text)

        room =
          Repo.Room.create(
            workspace.id,
            helpdesk_id: helpdesk.id,
            name: "F#{length(workspace.rooms) + 1} #{new_issue_title}",
            type: "public"
          )
          |> Repo.preload([:customer, :workspace])

        :ok = Api.Event.publish(room)

        sess = Slack.Utils.author_sess(helpdesk_integration, author)

        source_message_id = Repo.SlackMessageMapping.message_id(thread_ts, channel_id)

        if source_message_id do
          source_message = Repo.Message.get(source_message_id)
          source_room = Repo.Room.get(source_message.room_id)

          message_create_command = %Api.Message.Create{
            roomId: room.id,
            text: "Slack thread reply from #{source_room.name}",
            linkRoomId: source_room.id,
            linkStartMessageId: source_message_id,
            linkEndMessageId: source_message_id,
            linkType: "forward"
          }

          {:reply, %Api.Message.Ok{messageId: _}} = Api.Message.info(message_create_command, sess)
        end

        %Data.SlackChannelMapping{} =
          Repo.SlackChannelMapping.create(
            room_id: room.id,
            channel_id: channel_id,
            thread_id: thread_ts
          )

        case check_for_bot_mention(data: data, helpdesk_integration: helpdesk_integration) do
          :bot_mention ->
            :ok = handle_bot_mention(data: data, helpdesk_integration: helpdesk_integration)

          _ ->
            :ok =
              send_fog_message(
                data: data,
                helpdesk_integration: helpdesk_integration,
                room_id: room.id,
                sess: sess,
                from_name_override: from_name_override(author),
                from_image_url_override: from_image_url_override(author),
                from_app: from_app
              )
        end

      room_id ->
        %Data.Room{helpdesk: helpdesk} =
          Repo.Room.get(room_id) |> Repo.preload([:vendor, :helpdesk])

        case helpdesk.id === helpdesk_integration.helpdesk_id do
          false ->
            :ok

          true ->
            case check_for_bot_mention(data: data, helpdesk_integration: helpdesk_integration) do
              :bot_mention ->
                :ok = handle_bot_mention(data: data, helpdesk_integration: helpdesk_integration)

              _ ->
                sess = Slack.Utils.author_sess(helpdesk_integration, author)

                :ok =
                  send_fog_message(
                    data: data,
                    helpdesk_integration: helpdesk_integration,
                    room_id: room_id,
                    sess: sess,
                    from_name_override: from_name_override(author),
                    from_image_url_override: from_image_url_override(author),
                    from_app: from_app
                  )
            end
        end
    end
  end

  # top-level message in channel - aggressive ticketing OFF
  # post this message in Triage
  def handle_message_from_author(
        author,
        %{
          "channel" => _channel_id,
          "text" => _text,
          "ts" => _slack_message_ts
        } = data,
        # %Data.WorkspaceIntegration{specifics: %{"aggressive_ticketing" => false}},
        %Data.HelpdeskIntegration{helpdesk_id: helpdesk_id} = helpdesk_integration,
        from_app
      ) do
    case check_for_bot_mention(data: data, helpdesk_integration: helpdesk_integration) do
      :bot_mention ->
        :ok = handle_bot_mention(data: data, helpdesk_integration: helpdesk_integration)

      _ ->
        helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:triage, :vendor])
        triage = helpdesk.triage
        sess = Slack.Utils.author_sess(helpdesk_integration, author)

        :ok =
          send_fog_message(
            data: data,
            helpdesk_integration: helpdesk_integration,
            room_id: triage.id,
            sess: sess,
            from_name_override: from_name_override(author),
            from_image_url_override: from_image_url_override(author),
            from_app: from_app
          )
    end
  end

  # top-level message in channel - aggressive ticketing ON
  # create a new issue / thread
  #  defp handle_message_from_author(
  #         user,
  #         %{
  #           "channel" => channel_id,
  #           "text" => text,
  #           "ts" => slack_message_ts
  #         } = data,
  #         _workspace_integration,
  #         helpdesk_integration
  #       ) do
  #    helpdesk =
  #      Repo.Helpdesk.get(helpdesk_integration.helpdesk_id)
  #      |> Repo.preload([:vendor, :workspace, :customer, :rooms])
  #
  #    room =
  #      Repo.Room.create(
  #        helpdesk_id: helpdesk.id,
  #        name: "F#{length(helpdesk.rooms) + 1} #{text}",
  #        type: "public"
  #      )
  #      |> Repo.preload([:customer, :workspace])
  #
  #    :ok = Api.Event.publish(room)
  #
  #    %Data.SlackChannelMapping{} =
  #      Repo.SlackChannelMapping.create(
  #        room_id: room.id,
  #        channel_id: channel_id,
  #        thread_id: slack_message_ts
  #      )
  #
  #    user_sess = user_sess(helpdesk_integration, user)
  #
  #    case check_for_bot_mention(data: data, helpdesk_integration: helpdesk_integration) do
  #      :bot_mention ->
  #        :ok = handle_bot_mention(data: data, helpdesk_integration: helpdesk_integration)
  #
  #      _ ->
  #        :ok =
  #          send_fog_message(
  #            data: data,
  #            helpdesk_integration: helpdesk_integration,
  #            room_id: room.id,
  #            user_sess: user_sess
  #          )
  #
  #        vendor_support_name = "#{helpdesk.vendor.name} Support"
  #
  #        response =
  #          "New conversation created: *#{room.name}* - #{helpdesk.vendor.name} support will reply to you here as soon as possible."
  #
  #        %{"access_token" => access_token} = helpdesk_integration.specifics
  #
  #        {:ok, _} =
  #          Slack.Api.send_message(
  #            access_token,
  #            channel_id,
  #            slack_message_ts,
  #            vendor_support_name,
  #            # avatar_url,
  #            nil,
  #            response,
  #            # meta
  #            nil,
  #            # blocks
  #            nil
  #          )
  #
  #        :ok
  #    end
  #  end

  defp handle_bot_mention(data: data, helpdesk_integration: helpdesk_integration) do
    %{
      "text" => text,
      "channel" => channel_id,
      "ts" => slack_message_ts
    } = data

    %{
      "access_token" => access_token,
      "linked_channel_id" => linked_channel_id,
      "triage_thread_id" => triage_thread_id,
      "user_info" => %{
        "botUserId" => bot_user_id
      }
    } = helpdesk_integration.specifics

    %{helpdesk_id: helpdesk_id} = helpdesk_integration
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor])

    response =
      case String.split(text, "<@#{bot_user_id}> ") do
        ["", text] when text in ["help", "?"] ->
          "Available commands: status, help"

        ["", "status"] ->
          link_text =
            case Slack.Api.message_permalink(access_token, linked_channel_id, triage_thread_id) do
              {:ok, %{"permalink" => permalink}} ->
                " <#{permalink}|Ask a support question in your Triage thread>"

              _ ->
                ""
            end

          "Connected to #{helpdesk.vendor.name}. #{link_text}"

        _ ->
          "Unknown command. Available commands: status, help"
      end

    {:ok, _} =
      Slack.Api.send_message(
        access_token,
        channel_id,
        slack_message_ts,
        # name,
        nil,
        # avatar_url,
        nil,
        response,
        # meta
        nil,
        # blocks
        nil
      )

    :ok
  end

  defp slack_user_ids_to_mentions(helpdesk_integration, slack_user_ids, text) do
    %{"team_id" => slack_team_id} = helpdesk_integration.specifics

    mappings =
      slack_user_ids
      |> Enum.map(fn slack_user_id ->
        case Repo.SlackCustomerUserMapping.slack_user_id_to_mapping(
               slack_team_id,
               slack_user_id,
               helpdesk_integration.helpdesk_id
             ) do
          %Data.SlackCustomerUserMapping{} = mapping ->
            mapping

          [] ->
            case resolve_fog_user_by_slack_user_id(helpdesk_integration, slack_user_id) do
              :bot ->
                {:bot, slack_user_id}

              user ->
                Repo.SlackCustomerUserMapping.user_id_to_mapping(user.id)
            end
        end
      end)

    mappings
    |> Enum.reduce({text, []}, fn
      %Data.SlackCustomerUserMapping{
        user_id: user_id,
        slack_user_id: slack_user_id
      },
      {text, mentions} ->
        user = Repo.User.get(user_id)

        {text |> String.replace("<@#{slack_user_id}>", "@#{user.name}"),
         [%Api.Message.Mention{id: user.id, text: user.name} | mentions]}

      {:bot, slack_user_id}, {text, mentions} ->
        %Data.HelpdeskIntegration{helpdesk_id: helpdesk_id} = helpdesk_integration
        helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor])
        integration_tag_name = Customer.integration_tag_name(helpdesk_integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(helpdesk.workspace_id, integration_tag_name)

        {text |> String.replace("<@#{slack_user_id}>", "@#{bot_agent.name}"),
         [%Api.Message.Mention{id: bot_agent.id, text: bot_agent.name} | mentions]}
    end)
  end

  defp resolve_fog_user_by_slack_user_id(
         %Data.HelpdeskIntegration{specifics: %{"user_info" => %{"botUserId" => user_id}}},
         user_id
       ) do
    :bot
  end

  defp resolve_fog_user_by_slack_user_id(
         %Data.HelpdeskIntegration{specifics: specifics, helpdesk_id: helpdesk_id},
         slack_user_id
       ) do
    %{
      "team_id" => slack_team_id,
      "access_token" => access_token
    } = specifics

    Slack.Utils.resolve_fog_user_by_slack_user_id(
      access_token,
      slack_team_id,
      slack_user_id,
      helpdesk_id
    )
  end

  defp mentioned_users(nil, _), do: []
  defp mentioned_users([], acc), do: acc

  defp mentioned_users([%{"elements" => elements} | t], acc),
    do: mentioned_users(t, mentioned_users(elements, acc))

  defp mentioned_users([%{"type" => "user"} = u | t], acc), do: mentioned_users(t, [u | acc])
  defp mentioned_users([_ | t], acc), do: mentioned_users(t, acc)

  defp mentioned_slack_user_ids(data) do
    mentioned_users(data["blocks"], [])
    |> Enum.map(& &1["user_id"])
  end

  def user_sess(%{helpdesk_id: helpdesk_id}, user) do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor])
    Api.Session.for_user(helpdesk.vendor.id, helpdesk.id, user.id)
  end

  def check_for_bot_mention(data: data, helpdesk_integration: helpdesk_integration) do
    %{
      "user_info" => %{
        "botUserId" => bot_user_id
      }
    } = helpdesk_integration.specifics

    mentioned_slack_user_ids = mentioned_slack_user_ids(data)

    if bot_user_id in mentioned_slack_user_ids do
      :bot_mention
    else
      :continue
    end
  end

  def send_fog_message(
        data: data,
        helpdesk_integration: helpdesk_integration,
        room_id: room_id,
        sess: sess,
        from_name_override: from_name_override,
        from_image_url_override: from_image_url_override,
        from_app: from_app
      ) do
    %{"access_token" => access_token} = helpdesk_integration.specifics

    %{
      "text" => text,
      "ts" => slack_message_ts,
      "channel" => channel_id
    } = data

    # could be undefined
    files = data["files"]

    file_ids = Slack.Utils.file_ids(access_token, room_id, files, sess)

    # if file was send without text and we failed to download the file
    # we should set `text` to not empty string, otherwise it will crash
    fallback_text =
      if file_ids && length(file_ids) != length(files) do
        " uploaded a file"
      else
        ""
      end

    mentioned_slack_user_ids = mentioned_slack_user_ids(data)

    {text, mentions} =
      slack_user_ids_to_mentions(helpdesk_integration, mentioned_slack_user_ids, text)

    text = text |> Slack.Utils.slack_links_to_markdown()

    cmd = %Api.Message.Create{
      fromApp: from_app,
      roomId: room_id,
      fileIds: file_ids,
      text: text <> fallback_text,
      mentions: mentions,
      fromNameOverride: from_name_override,
      fromAvatarUrlOverride: from_image_url_override
    }

    {:reply, %Api.Message.Ok{messageId: message_id}} = Api.Message.info(cmd, sess)

    %Data.SlackMessageMapping{} =
      Repo.SlackMessageMapping.create(
        message_id: message_id,
        slack_message_ts: slack_message_ts,
        slack_channel_id: channel_id
      )

    :ok
  end

  defp from_name_override(%Data.User{}), do: nil
  defp from_name_override(%Data.Agent{from_name_override: name}), do: name

  defp from_image_url_override(%Data.User{}), do: nil
  defp from_image_url_override(%Data.Agent{from_image_url_override: image}), do: image
end
