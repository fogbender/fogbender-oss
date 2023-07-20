defmodule Fog.Comms.Slack.Customer.MessageTask do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Api, Data, Repo}
  alias Fog.Comms.{Slack}
  alias Slack.{Customer}

  @broadcast_threshold_seconds 3600

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(cmd, message, room, sess) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [cmd, message, room, sess])

    :ok
  end

  def schedule(cmd, message, sess) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [cmd, message, nil, sess])

    :ok
  end

  def run(cmd, %Data.Message{room_id: room_id} = message, nil, sess) do
    room = Fog.Repo.Room.get(room_id) |> Fog.Repo.preload(tags: :tag)
    run(cmd, message, room, sess)
  end

  def run(
        %Api.Message.Create{fromApp: from_app} = cmd,
        %Data.Message{} = message,
        %Data.Room{helpdesk_id: helpdesk_id} = room,
        sess
      )
      when from_app !== "slack-customer" do
    workspace_integration = Customer.Utils.get_slack_customer_workspace_integration(helpdesk_id)

    case try_handle_command(
           cmd,
           message,
           workspace_integration,
           sess
         ) do
      :ok ->
        :ok

      :not_found ->
        helpdesk_integration = Customer.Utils.get_slack_customer_helpdesk_integration(helpdesk_id)
        :ok = f0(cmd, message, room, helpdesk_integration, sess)

        :ok = sync_with_shared_channels(cmd, message, room, sess)
    end
  end

  def run(
        %Api.Message.SetReaction{fromApp: from_app} = cmd,
        %Data.Message{} = message,
        %Data.Room{helpdesk_id: helpdesk_id} = room,
        sess
      )
      when from_app !== "slack-customer" do
    # workspace_integration = Customer.Utils.get_slack_customer_workspace_integration(helpdesk_id)
    helpdesk_integration = Customer.Utils.get_slack_customer_helpdesk_integration(helpdesk_id)

    :ok = f0(cmd, message, room, helpdesk_integration, sess)
    :ok = sync_with_shared_channels(cmd, message, room, sess)
  end

  def run(
        %Api.Message.Update{fromApp: from_app} = cmd,
        %Data.Message{} = message,
        %Data.Room{helpdesk_id: helpdesk_id} = room,
        sess
      )
      when from_app !== "slack-customer" do
    # workspace_integration = Customer.Utils.get_slack_customer_workspace_integration(helpdesk_id)
    helpdesk_integration = Customer.Utils.get_slack_customer_helpdesk_integration(helpdesk_id)

    :ok = f0(cmd, message, room, helpdesk_integration, sess)
    :ok = sync_with_shared_channels(cmd, message, room, sess)
  end

  def run(_, _, _, _), do: :ok

  def sync_with_shared_channels(cmd, message, %Data.Room{helpdesk_id: helpdesk_id} = room, sess) do
    link_room_id =
      case cmd do
        %Api.Message.Create{linkRoomId: link_room_id} ->
          link_room_id

        _ ->
          nil
      end

    integrations =
      case {Slack.Agent.MessageTask.get_slack_integrations(room.id), link_room_id} do
        {[], nil} ->
          []

        {[], link_room_id} ->
          Slack.Agent.MessageTask.get_slack_integrations(link_room_id)

        {integrations, _} ->
          integrations
      end

    integrations
    |> Enum.each(fn integration ->
      shared_channel_helpdesk_associations =
        integration.specifics["shared_channel_helpdesk_associations"] || []

      case shared_channel_helpdesk_associations
           |> Enum.find(&(&1["helpdesk_id"] === helpdesk_id)) do
        nil ->
          nil

        %{"shared_channel_id" => shared_channel_id} ->
          access_token = integration.specifics["access_token"]
          bot_user_info = integration.specifics["user_info"]
          team_name = integration.specifics["team_name"]
          slack_team_id = integration.project_id

          helpdesk_integration =
            Slack.Agent.Hook.load_helpdesk_integration(
              access_token: access_token,
              bot_user_info: bot_user_info,
              team_name: team_name,
              team_id: slack_team_id,
              channel_id: shared_channel_id,
              helpdesk_id: helpdesk_id
            )

          :ok = f0(cmd, message, room, helpdesk_integration, sess)
      end
    end)

    :ok
  end

  def try_handle_command(cmd, message, %Data.WorkspaceIntegration{} = integration, _sess) do
    integration = integration |> Repo.preload(workspace: :vendor)
    workspace = integration.workspace
    %Data.Message{mentions: mentions} = message

    integration_tag_name = Customer.integration_tag_name(integration)

    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)

    mention =
      mentions
      |> Enum.find(fn %Data.Mention{agent_id: agent_id} -> agent_id === bot_agent.id end)

    try_handle_mention({mention, cmd, message, integration, bot_agent})
  end

  def try_handle_command(_, _, _, _), do: :not_found

  def try_handle_mention(
        {%Data.Mention{}, _cmd, %Data.Message{room_id: room_id, text: text}, integration,
         bot_agent}
      ) do
    vendor = integration.workspace.vendor
    room = Repo.Room.get(room_id) |> Repo.preload(helpdesk: :customer)
    helpdesk = room.helpdesk
    bot_agent_sess = Api.Session.for_agent(vendor.id, bot_agent.id) |> Api.init()

    case {room.is_triage, text} do
      {_, "@Slack (Customer) status"} ->
        reply =
          case Repo.HelpdeskIntegration.get(room.helpdesk.id, "slack-customer") do
            %Data.HelpdeskIntegration{specifics: specifics} ->
              %{
                "team_name" => team_name
              } = specifics

              "Connected to #{team_name}"

            nil ->
              "Not connected"
          end

        cmd = %Api.Message.Create{
          roomId: room_id,
          text: reply
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok

      {_, "@Slack (Customer) disconnect"} ->
        reply =
          case Repo.HelpdeskIntegration.get(room.helpdesk.id, "slack-customer") do
            %Data.HelpdeskIntegration{} = helpdesk_integration ->
              %Data.HelpdeskIntegration{} = Repo.HelpdeskIntegration.delete(helpdesk_integration)
              "Disconnected"

            nil ->
              "Not connected"
          end

        cmd = %Api.Message.Create{
          roomId: room_id,
          text: reply
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok

      {true, "@Slack (Customer) init"} ->
        reply =
          case Repo.HelpdeskIntegration.get(room.helpdesk.id, "slack-customer") do
            %Data.HelpdeskIntegration{specifics: specifics} ->
              %{
                "team_name" => team_name
              } = specifics

              "This helpdesk is already connected to #{helpdesk.customer.name}’s Slack (team name: #{team_name}). To disconnect, post '@Slack (Customer) disconnect'"

            nil ->
              {:ok, connect_code} = Repo.ConnectCode.create_connect_code(room.helpdesk_id)

              oauth_url =
                "#{Fog.env(:fog_api_url)}/oauth/slack-customer-auth?state=#{connect_code}"

              """
              Customer: to connect #{helpdesk.customer.name}’s Slack to this support environment, click below -\n\n

              [Connect to Slack](#{oauth_url})
              """
          end

        cmd = %Api.Message.Create{
          roomId: room_id,
          text: reply
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok

      {false, "@Slack (Customer) init"} ->
        cmd = %Api.Message.Create{
          roomId: room_id,
          text: "This command works in Triage rooms only"
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok

      _ ->
        cmd = %Api.Message.Create{
          roomId: room_id,
          text: "Unknown command. Known commands: 'init', 'disconnect', 'status'"
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok
    end
  end

  def try_handle_mention(_), do: :not_found

  def f0(_, _, _, nil, _), do: :ok

  def f0(
        cmd,
        message,
        %Data.Room{} = room,
        %Data.HelpdeskIntegration{specifics: specifics} = helpdesk_integration,
        sess
      ) do
    access_token = specifics["access_token"]

    case access_token do
      nil ->
        :ok

      _ ->
        f1(cmd, message, room, helpdesk_integration, sess)
    end
  end

  defp f1(
         cmd,
         message,
         room,
         helpdesk_integration,
         sess
       ) do
    user_id = Api.Message.author(:user, sess)
    agent_id = Api.Message.author(:agent, sess)

    author =
      if user_id do
        Repo.User.get(user_id)
      else
        Repo.Agent.get(agent_id)
      end

    is_bot =
      if agent_id do
        author.is_bot
      else
        false
      end

    if is_bot do
      :ok
    else
      f2(cmd, author, message, room, helpdesk_integration)
    end
  end

  defp f2(cmd, author, message, room, helpdesk_integration) do
    access_token = helpdesk_integration.specifics["access_token"]
    linked_channel_id = helpdesk_integration.specifics["linked_channel_id"]
    slack_team_id = helpdesk_integration.specifics["team_id"]

    cond do
      is_nil(access_token) ->
        :ok

      is_nil(linked_channel_id) ->
        :ok

      true ->
        f3(
          cmd: cmd,
          linked_channel_id: linked_channel_id,
          access_token: access_token,
          author: author,
          message: message,
          room: room,
          slack_team_id: slack_team_id
        )
    end
  end

  defp f3(
         cmd: cmd,
         linked_channel_id: linked_channel_id,
         access_token: access_token,
         author: author,
         message: %Data.Message{} = message,
         room: %Data.Room{is_triage: true},
         slack_team_id: slack_team_id
       ) do
    #  This is a message in Triage
    #  Aggressive ticketing is OFF, meaning we simply send our message to linked_channel_id

    message = message |> Repo.preload([:files, :sources])
    f5(cmd, nil, linked_channel_id, access_token, author, message, slack_team_id)
  end

  defp f3(
         cmd: cmd,
         linked_channel_id: linked_channel_id,
         access_token: access_token,
         author: author,
         message: %Data.Message{room_id: room_id} = message,
         room: room,
         slack_team_id: slack_team_id
       ) do
    message = message |> Repo.preload([:files, :sources])

    case Repo.SlackChannelMapping.thread_id(linked_channel_id, room_id) do
      nil ->
        f4(linked_channel_id, access_token, author, message, room)

      thread_id ->
        f5(cmd, thread_id, linked_channel_id, access_token, author, message, slack_team_id)
    end
  end

  # If a user responds to a thread in Slack, we create a Fogbender room with a forward message.
  # This cmd _is_ that forward - we need to skip it, because the user already has an associated thread.
  defp f4(_linked_channel_id, _access_token, %Fog.Data.User{}, _message, _room), do: :ok

  defp f4(linked_channel_id, access_token, author, message, room) do
    name = author.name
    avatar_url = avatar_url(author)
    room = room |> Repo.preload([:customer, helpdesk: :vendor])
    message = message |> Repo.preload([:sources])
    vendor_support_name = "#{room.helpdesk.vendor.name} Support"

    ok =
      not is_nil(room) and
        not String.starts_with?(room.customer.name, "$Cust_Internal") and
        (room.type === "public" or "all" in room.agent_groups)

    case ok do
      false ->
        :ok

      true ->
        tag_names = room.tags |> Enum.map(& &1.tag.name)

        room_type =
          cond do
            ":feature" in tag_names ->
              "feature request"

            ":bug" in tag_names ->
              "bug"

            true ->
              "issue"
          end

        room_name_text = "New #{room_type}: #{room.name}"

        {context_section, source_room_id} =
          case message.sources do
            [] ->
              {[], nil}

            _ ->
              first_source_message_id = message.sources |> hd() |> Map.get(:id)
              first_source_message_room_id = message.sources |> hd() |> Map.get(:room_id)

              source_slack_message_ts =
                Repo.SlackMessageMapping.slack_message_ts(
                  first_source_message_id,
                  linked_channel_id
                )

              {:ok, %{"permalink" => source_permalink}} =
                Slack.Api.message_permalink(
                  access_token,
                  linked_channel_id,
                  source_slack_message_ts
                )

              block = [
                %{
                  "type" => "section",
                  "fields" => [
                    %{
                      "type" => "mrkdwn",
                      "text" => "<#{source_permalink}|Jump to origin>"
                    }
                  ]
                }
              ]

              {block, first_source_message_room_id}
          end

        blocks =
          [
            %{
              "type" => "header",
              "text" => %{
                "type" => "plain_text",
                "text" => room_name_text,
                "emoji" => true
              }
            }
          ] ++ context_section

        {:ok, %{"ts" => thread_id}} =
          Slack.Api.send_message(
            access_token,
            linked_channel_id,
            # thread_id
            nil,
            # name,
            vendor_support_name,
            # avatar_url,
            nil,
            # text
            nil,
            # meta
            nil,
            # blocks
            blocks
          )

        %Data.SlackChannelMapping{} =
          Repo.SlackChannelMapping.create(
            room_id: room.id,
            channel_id: linked_channel_id,
            thread_id: thread_id
          )

        text = Slack.Utils.message_text(message)
        message = message |> Repo.preload(:files)

        new_message_ts =
          case message.files do
            [] ->
              {:ok, %{"message" => %{"ts" => message_ts}}} =
                Slack.Api.send_message(
                  access_token,
                  linked_channel_id,
                  thread_id,
                  name,
                  avatar_url,
                  text
                )

              %Data.SlackMessageMapping{} =
                Repo.SlackMessageMapping.create(
                  message_id: message.id,
                  slack_message_ts: message_ts,
                  slack_channel_id: linked_channel_id
                )

              message_ts

            files ->
              {:ok, message_ts} =
                upload_files(
                  access_token,
                  author,
                  linked_channel_id,
                  thread_id,
                  message.id,
                  text,
                  files
                )

              message_ts
          end

        case source_room_id do
          nil ->
            :ok

          _ ->
            case Repo.SlackChannelMapping.thread_id(linked_channel_id, source_room_id) do
              nil ->
                :ok

              source_thread_id ->
                {:ok, %{"permalink" => new_thread_permalink}} =
                  Slack.Api.message_permalink(access_token, linked_channel_id, new_message_ts)

                {:ok, _} =
                  Slack.Api.send_message(
                    access_token,
                    linked_channel_id,
                    source_thread_id,
                    vendor_support_name,
                    nil,
                    "*#{room_name_text}* created - <#{new_thread_permalink}|Open thread>"
                  )

                :ok
            end
        end
    end
  end

  defp f5(
         %Api.Message.Create{},
         thread_id,
         linked_channel_id,
         access_token,
         author,
         %Data.Message{files: files} = message,
         _
       )
       when files != [] do
    %Data.Message{id: message_id, text: text} = message

    {:ok, _} =
      upload_files(access_token, author, linked_channel_id, thread_id, message_id, text, files)

    :ok
  end

  defp f5(
         %Api.Message.Create{},
         thread_id,
         linked_channel_id,
         access_token,
         author,
         %Data.Message{} = message,
         slack_team_id
       ) do
    %Data.Message{id: message_id, room_id: room_id, inserted_at: ts0} = message
    name = author.name
    avatar_url = avatar_url(author)
    reply_broadcast = calc_reply_broadcast(room_id, author, message, ts0)

    text = Slack.Utils.message_text(message)

    text =
      message.mentions
      |> Enum.reduce(text, fn
        %Data.Mention{agent_id: nil}, text ->
          text

        %Data.Mention{text: mention_text, agent_id: agent_id}, text ->
          case Repo.SlackAgentMapping.slack_user_id(agent_id, slack_team_id) do
            nil ->
              text

            slack_user_id ->
              text |> String.replace("@#{mention_text}", "<@#{slack_user_id}>")
          end
      end)

    {:ok, %{"message" => %{"ts" => slack_message_ts}}} =
      Slack.Api.send_message(
        access_token,
        linked_channel_id,
        thread_id,
        name,
        avatar_url,
        text,
        nil,
        [],
        reply_broadcast
      )

    %Data.SlackMessageMapping{} =
      Repo.SlackMessageMapping.create(
        message_id: message_id,
        slack_message_ts: slack_message_ts,
        slack_channel_id: linked_channel_id
      )

    :ok
  end

  defp f5(
         %Api.Message.SetReaction{reaction: reaction},
         _,
         linked_channel_id,
         access_token,
         %{id: author_id},
         %Data.Message{id: message_id} = message,
         _
       ) do
    case Repo.SlackMessageMapping.slack_message_ts(message_id, linked_channel_id) do
      nil ->
        :ok

      slack_message_ts ->
        case reaction do
          nil ->
            :ok =
              remove_reaction(
                message,
                author_id,
                access_token,
                linked_channel_id,
                slack_message_ts
              )

          reaction ->
            :ok = add_reaction(reaction, access_token, linked_channel_id, slack_message_ts)
        end
    end
  end

  defp f5(
         %Api.Message.Update{messageId: message_id, text: nil},
         _,
         linked_channel_id,
         access_token,
         _,
         _,
         _
       ) do
    case Repo.SlackMessageMapping.slack_message_ts(message_id, linked_channel_id) do
      nil ->
        :ok

      slack_message_ts ->
        {:ok, _} = Slack.Api.delete_message(access_token, linked_channel_id, slack_message_ts)

        :ok
    end
  end

  defp f5(
         %Api.Message.Update{messageId: message_id, text: text},
         _,
         linked_channel_id,
         access_token,
         _,
         _,
         _
       ) do
    case Repo.SlackMessageMapping.slack_message_ts(message_id, linked_channel_id) do
      nil ->
        :ok

      slack_message_ts ->
        {:ok, _} =
          Slack.Api.update_message(access_token, linked_channel_id, slack_message_ts, text)

        :ok
    end
  end

  defp calc_reply_broadcast(room_id, author, message, ts0) do
    case author do
      %Data.Agent{} ->
        false

      %Data.User{} ->
        messages_query = from(m in Fog.Data.Message, order_by: [desc: m.inserted_at], limit: 5)
        room = Repo.Room.get(room_id) |> Repo.preload(messages: messages_query)

        case room.messages |> Enum.find(fn m -> m.id != message.id end) do
          nil ->
            false

          %Data.Message{inserted_at: ts1} ->
            DateTime.diff(ts0, ts1) > @broadcast_threshold_seconds
        end
    end
  end

  defp remove_reaction(message, author_id, access_token, linked_channel_id, slack_message_ts) do
    reaction =
      message.reactions
      |> Enum.find_value(fn
        %Data.MessageReaction{:agent_id => ^author_id, :reaction => reaction} -> reaction
        %Data.MessageReaction{:user_id => ^author_id, :reaction => reaction} -> reaction
        _ -> false
      end)

    case reaction do
      nil ->
        :ok

      reaction ->
        case Exmoji.Scanner.scan(reaction) do
          [%Exmoji.EmojiChar{short_name: short_name}] ->
            case Slack.Api.remove_reaction(
                   access_token,
                   linked_channel_id,
                   slack_message_ts,
                   short_name
                 ) do
              {:ok, _} ->
                :ok
            end

          _ ->
            :ok
        end
    end
  end

  defp add_reaction(reaction, access_token, linked_channel_id, slack_message_ts) do
    case Exmoji.Scanner.scan(reaction) do
      [%Exmoji.EmojiChar{short_name: short_name}] ->
        case Slack.Api.add_reaction(access_token, linked_channel_id, slack_message_ts, short_name) do
          {:ok, _} ->
            :ok

          {:error, %{"error" => "already_reacted"}} ->
            :ok
        end

      _ ->
        :ok
    end
  end

  defp avatar_url(author) do
    case author do
      %Data.User{image_url: "https://avatars.dicebear.com" <> _ = image_url} ->
        image_url |> String.replace(".svg", ".png")

      _ ->
        author.image_url
    end
  end

  defp upload_files(access_token, author, linked_channel_id, thread_id, message_id, text, files) do
    message_tss =
      files
      |> Enum.with_index()
      |> Enum.map(fn {file, i} ->
        try do
          %Fog.Data.File{
            filename: filename,
            content_type: content_type,
            data: %{
              "file_s3_file_path" => file_s3_file_path
            }
          } = file

          {:ok, file_body} = Fog.Api.File.get_s3_file(file_s3_file_path)

          res =
            Slack.Api.upload_file(
              access_token,
              linked_channel_id,
              thread_id,
              filename,
              content_type,
              file_body,
              if i === 0 do
                "[#{author.name}]: #{text}"
              else
                ""
              end
            )

          slack_messages =
            case res do
              {:ok, %{"file" => %{"shares" => %{"public" => slack_messages}}}} -> slack_messages
              {:ok, %{"file" => %{"shares" => %{"private" => slack_messages}}}} -> slack_messages
            end

          {_team_id, [%{"ts" => slack_message_ts} | _]} = Enum.at(slack_messages, 0)

          %Data.SlackMessageMapping{} =
            Repo.SlackMessageMapping.create(
              message_id: message_id,
              slack_message_ts: slack_message_ts,
              slack_channel_id: linked_channel_id
            )

          slack_message_ts
        rescue
          e ->
            Logger.error("Failed to upload a file to Slack: #{inspect(e)}")
            {:error, e}
        end
      end)

    {:ok, message_tss |> hd}
  end
end
