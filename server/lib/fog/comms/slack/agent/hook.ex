defmodule Fog.Comms.Slack.Agent.Hook do
  require Logger

  import Ecto.Query, only: [from: 2, order_by: 2]

  import Ecto.Query

  alias Fog.{Api, Data, Repo}
  alias Fog.Comms.{Slack, Utils}

  use Task

  def consume(payload) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def run(data) do
    token = Fog.env(:slack_verification_token)

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

    case get_slack_integrations(slack_team_id) do
      nil ->
        :ok

      [] ->
        :ok

      integrations ->
        integrations
        |> Enum.each(fn integration ->
          try do
            message_id = Repo.SlackMessageMapping.message_id(message_ts, channel_id)

            case nil in [
                   channel_id,
                   message_ts,
                   text,
                   token,
                   slack_team_id,
                   integration,
                   message_id
                 ] do
              true ->
                :ok

              false ->
                {sess, from_app} =
                  case resolve_fog_author_by_slack_user_id(integration, user_id, channel_id) do
                    {_access_token, _email, agent, _, workspace} ->
                      {Api.Session.for_agent(workspace.vendor_id, agent.id), "slack"}

                    {author, %Data.HelpdeskIntegration{} = helpdesk_integration} ->
                      {Slack.Utils.author_sess(helpdesk_integration, author), "slack-customer"}
                  end

                text = text |> Slack.Utils.slack_links_to_markdown()

                cmd = %Api.Message.Update{
                  messageId: message_id,
                  fromApp: from_app,
                  text: text
                }

                {:reply, %Api.Message.Ok{messageId: ^message_id}} = Api.Message.info(cmd, sess)
            end
          rescue
            e ->
              Logger.error(Exception.format(:error, e, __STACKTRACE__))
          end
        end)
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

    case get_slack_integrations(slack_team_id) do
      nil ->
        :ok

      [] ->
        :ok

      integrations ->
        integrations
        |> Enum.each(fn integration ->
          try do
            message_id = Repo.SlackMessageMapping.message_id(message_ts, channel_id)

            case nil in [channel_id, message_ts, token, slack_team_id, integration, message_id] do
              true ->
                :ok

              false ->
                {sess, from_app} =
                  case resolve_fog_author_by_slack_user_id(integration, user_id, channel_id) do
                    {_access_token, _email, agent, _, workspace} ->
                      {Api.Session.for_agent(workspace.vendor_id, agent.id), "slack"}

                    {author, %Data.HelpdeskIntegration{} = helpdesk_integration} ->
                      {Slack.Utils.author_sess(helpdesk_integration, author), "slack-customer"}
                  end

                cmd = %Api.Message.Update{
                  messageId: message_id,
                  fromApp: from_app,
                  text: nil
                }

                {:reply, %Api.Message.Ok{messageId: ^message_id}} = Api.Message.info(cmd, sess)
            end

            :ok
          rescue
            e ->
              Logger.error(Exception.format(:error, e, __STACKTRACE__))
          end
        end)
    end
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{"type" => "message"} = event,
           "context_team_id" => team_id0,
           "team_id" => team_id1
         },
         token
       )
       when t === token do
    # NOTE: the meaning of context_team_id is not defined in Slack documentation, and the relationship between team_id and context_team_id is unclear. One of these should belong to an integration - looks like we'll have to check both
    case event do
      %{"bot_id" => _} ->
        # ignore bot messages
        :ok

      _ ->
        case get_slack_integrations([team_id0, team_id1]) do
          nil ->
            :ok

          [] ->
            :ok

          integrations ->
            integrations
            |> Enum.each(fn integration ->
              try do
                handle_slack_message(integration, event)
              rescue
                e ->
                  Logger.error(Exception.format(:error, e, __STACKTRACE__))
              end
            end)
        end
    end
  end

  defp process_event(
         %{
           "token" => t,
           "type" => "event_callback",
           "event" => %{"type" => "member_joined_channel"} = event
         },
         token
       )
       when t === token do
    slack_team_id = event["team"]

    case get_slack_integrations(slack_team_id) do
      nil ->
        :ok

      [] ->
        :ok

      integrations ->
        integrations
        |> Enum.each(fn integration ->
          try do
            handle_slack_join(integration, event)
          rescue
            e ->
              Logger.error(Exception.format(:error, e, __STACKTRACE__))
          end
        end)
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

      case get_slack_integrations(team_id) do
        nil ->
          :ok

        [] ->
          :ok

        integrations ->
          integrations
          |> Enum.each(fn integration ->
            try do
              {sess, from_app} =
                case resolve_fog_author_by_slack_user_id(integration, user_id, channel_id) do
                  {_access_token, _email, agent, role, workspace} ->
                    case agent do
                      nil ->
                        {nil, nil}

                      agent ->
                        case role do
                          %Data.VendorAgentRole{role: role}
                          when role in ["agent", "admin", "owner"] ->
                            {Api.Session.for_agent(workspace.vendor_id, agent.id), "slack"}

                          _ ->
                            {nil, nil}
                        end
                    end

                  {author, %Data.HelpdeskIntegration{} = helpdesk_integration} ->
                    {Slack.Utils.author_sess(helpdesk_integration, author), "slack-customer"}

                  _ ->
                    {nil, nil}
                end

              if sess do
                cmd = %Api.Message.SetReaction{
                  fromApp: from_app,
                  messageId: message_id,
                  reaction:
                    if type === "reaction_added" do
                      Utils.to_fog_reaction(reaction)
                    else
                      nil
                    end
                }

                {:reply, %Api.Message.Ok{}} = Api.Message.info(cmd, sess)
              end

              :ok
            rescue
              e ->
                Logger.error(Exception.format(:error, e, __STACKTRACE__))
            end
          end)
      end
    end
  end

  defp process_event(_, _) do
    :ok
  end

  defp handle_slack_join(nil, _), do: :ok

  defp handle_slack_join(integration, event) do
    %Data.WorkspaceIntegration{
      specifics: %{
        # "access_token" => access_token,
        "team_id" => team_id,
        "user_info" => %{
          "botUserId" => bot_user_id
        }
      }
    } = integration

    shared_channel_helpdesk_associations =
      integration.specifics["shared_channel_helpdesk_associations"] || []

    case event do
      %{
        "user" => ^bot_user_id,
        "channel" => channel_id,
        "team" => ^team_id
      } ->
        case shared_channel_helpdesk_associations
             |> Enum.find(&(&1["shared_channel_id"] === channel_id)) do
          nil ->
            # XXX this breaks for private shared channels - let's disable for the time being
            # This is not one of our known shared customer channels - assume agents want to switch the integration to a different channel
            #            integration
            #            |> Data.WorkspaceIntegration.update(
            #              specifics:
            #                Map.merge(integration.specifics, %{
            #                  "linked_channel_id" => channel_id
            #                })
            #            )
            #            |> Repo.update!()
            #
            #            Logger.info(
            #              "Our Slack bot was switched to channel #{channel_id} - #{inspect(integration)}"
            #            )

            :ok

          _ ->
            :ok
        end

      _ ->
        # not a bot user
        :ok
    end
  end

  defp get_slack_integrations(nil), do: nil

  defp get_slack_integrations(slack_team_id) when is_binary(slack_team_id) do
    get_slack_integrations([slack_team_id])
  end

  defp get_slack_integrations(slack_team_ids) when is_list(slack_team_ids) do
    from(
      i in Data.WorkspaceIntegration,
      where: i.type == "slack",
      where: i.project_id in ^slack_team_ids
    )
    |> Repo.all()
  end

  defp handle_slack_message(integration, data) do
    case data["subtype"] do
      subtype when is_nil(subtype) or subtype === "file_share" ->
        %{"user" => user_id, "channel" => channel_id} = data

        case resolve_fog_author_by_slack_user_id(integration, user_id, channel_id) do
          :bot ->
            :ok

          {access_token, email, nil, _, _} ->
            handle_unknown_agent(access_token, email, data)

          {access_token, email, %Data.Agent{} = agent, role, _} ->
            case role do
              nil ->
                handle_unknown_agent(access_token, email, data)

              %Data.VendorAgentRole{role: role} when role in ["agent", "admin", "owner"] ->
                handle_known_agent(
                  access_token,
                  agent,
                  data,
                  integration.workspace_id,
                  integration.project_id
                )

              _ ->
                handle_reader_agent(access_token, agent, data)
            end

          {author, %Data.HelpdeskIntegration{} = helpdesk_integration} ->
            :ok =
              Slack.Customer.Hook.handle_message_from_author(
                author,
                data,
                helpdesk_integration,
                "slack-customer"
              )

          nil ->
            :ok
        end

      _ ->
        :ok
    end
  end

  defp handle_known_agent(
         access_token,
         agent,
         %{
           "channel" => channel_id,
           "thread_ts" => thread_ts,
           "text" => text,
           "blocks" => blocks,
           "ts" => slack_message_ts
         } = data,
         integration_workspace_id,
         slack_team_id
       ) do
    # thread reply, let's find thread root

    case Repo.SlackChannelMapping.room_id(channel_id, thread_ts) do
      nil ->
        :ok

      room_id ->
        %Data.Room{workspace: workspace} = Repo.Room.get(room_id) |> Repo.preload(:vendor)

        case workspace.id === integration_workspace_id do
          false ->
            :ok

          true ->
            agent_sess = Api.Session.for_agent(workspace.vendor_id, agent.id)

            # could be undefined
            files = data["files"]
            file_ids = Slack.Utils.file_ids(access_token, room_id, files, agent_sess)

            # if file was send without text and we failed to download the file
            # we should set `text` to not empty string otherwise it will crash
            fallback_text =
              if file_ids && length(file_ids) != length(files) do
                " uploaded a file"
              else
                ""
              end

            {unknown_slack_user_ids, known_slack_user_ids} =
              resolve_slack_user_ids(slack_team_id, data)

            case unknown_slack_user_ids do
              [] ->
                {text, mentions} =
                  case Fog.Comms.Slack.RichTextToMarkdown.convert(blocks, known_slack_user_ids) do
                    :unsupported ->
                      {text, mentions} = slack_user_ids_to_mentions(known_slack_user_ids, text)

                      text = text |> Slack.Utils.slack_links_to_markdown()

                      {text, mentions}

                    {markdown, mentions} ->
                      {markdown, mentions}
                  end

                cmd = %Api.Message.Create{
                  fromApp: "slack",
                  roomId: room_id,
                  fileIds: file_ids,
                  text: text <> fallback_text,
                  mentions: mentions
                }

                {:reply, %Api.Message.Ok{messageId: message_id}} =
                  Api.Message.info(cmd, agent_sess)

                %Data.SlackMessageMapping{} =
                  Repo.SlackMessageMapping.create(
                    message_id: message_id,
                    slack_message_ts: slack_message_ts,
                    slack_channel_id: channel_id
                  )

                :ok

              _ ->
                warning = unknown_slack_users_to_warning(unknown_slack_user_ids)

                Slack.Api.send_message(
                  access_token,
                  channel_id,
                  thread_ts,
                  nil,
                  nil,
                  warning
                )

                :ok
            end
        end
    end
  end

  # not a thread reply, skip
  defp handle_known_agent(_, _, _, _, _) do
    :ok
  end

  defp handle_unknown_agent(access_token, email, %{
         "ts" => ts,
         "channel" => channel_id,
         "user" => user_id
       }) do
    thread_id = ts

    {:ok, _} =
      Slack.Api.send_message(
        access_token,
        channel_id,
        thread_id,
        nil,
        nil,
        "Note: The message above will not be seen by the customer because <@#{user_id}> does not have an associated Fogbender agent account."
      )

    {:ok, _} =
      Slack.Api.send_ephemeral(
        access_token,
        channel_id,
        user_id,
        thread_id,
        if email do
          "Make sure that your Fogbender account has the same email as your Slack user (#{email})"
        else
          "Couldn’t determine the email address associated with your Slack account"
        end
      )

    :ok
  end

  defp handle_reader_agent(access_token, _email, %{
         "ts" => ts,
         "channel" => channel_id,
         "user" => user_id
       }) do
    thread_id = ts

    _x =
      Slack.Api.send_message(
        access_token,
        channel_id,
        thread_id,
        nil,
        nil,
        "Note: The message above will not be seen by the customer because <@#{user_id}>’s Fogbender role is `Reader`."
      )

    :ok
  end

  # not a thread reply, skip
  defp handle_reader_agent(_, _, _), do: :ok

  defp slack_user_ids_to_mentions(known_slack_user_ids, text) do
    known_slack_user_ids
    |> Enum.reduce({text, []}, fn %Data.SlackAgentMapping{
                                    agent_id: agent_id,
                                    slack_user_id: slack_user_id
                                  },
                                  {text, mentions} ->
      agent = Repo.Agent.get(agent_id)

      {text |> String.replace("<@#{slack_user_id}>", "@#{agent.name}"),
       [%Api.Message.Mention{id: agent.id, text: agent.name} | mentions]}
    end)
  end

  defp unknown_slack_users_to_warning(unknown_slack_user_ids) do
    {x0, x1, x2, x3, x4} =
      case unknown_slack_user_ids |> Enum.map(&"<@#{&1}>") do
        [x] ->
          {"mention", x, "does", "an", "account"}

        [x, y] ->
          {"mentions", "#{x} and #{y}", "do", "", "accounts"}

        [h | t] ->
          {"mentions", ["and #{h}" | t] |> Enum.reverse() |> Enum.join(", "), "do", "",
           "accounts"}
      end

    "Note: The message above will not be seen by the customer because we could not resolve the #{x0} for #{x1} since they #{x2} not have #{x3} associated Fogbender agent #{x4}."
    |> String.replace(~r/ +/, " ")
  end

  defp resolve_fog_author_by_slack_user_id(
         %Data.WorkspaceIntegration{specifics: %{"user_info" => %{"botUserId" => user_id}}},
         user_id,
         _channel_id
       ) do
    :bot
  end

  defp resolve_fog_author_by_slack_user_id(integration, slack_user_id, channel_id) do
    %{"team_name" => agent_team_name} = integration.specifics
    %{workspace_id: workspace_id} = integration

    {access_token, agent_team_id, bot_user_info, linked_channel_id, workspace} =
      workspace_et_cetera(integration)

    case {slack_user_info(access_token, slack_user_id), channel_id} do
      {{email, ^agent_team_id, _name, _avatar_url}, ^linked_channel_id} ->
        # Slack user is native to the agent Slack app posting in Slack (Agent) integration channel

        # We'll assume that bob@fogbender.net is the same agent as bob@fogbender.com
        # The common use case here is that a company uses Google Auth with domain X
        # and Slack with domain Y (due to pivot)
        [username, _] = email |> String.split("@")

        emails =
          [
            email
            | workspace.vendor.verified_domains
              |> Enum.filter(& &1.verified)
              |> Enum.map(&"#{username}@#{&1.domain}")
          ]
          |> Enum.uniq()

        agent =
          case from(
                 a in Data.Agent,
                 join: var in assoc(a, :vendors),
                 on: var.vendor_id == ^workspace.vendor_id,
                 where: a.email in ^emails
               )
               |> Repo.all() do
            [a | _] ->
              a

            nil ->
              nil
          end

        role =
          case agent do
            nil ->
              nil

            agent ->
              agent = agent |> Repo.preload(:vendors)
              agent.vendors |> Enum.find(&(&1.vendor_id === workspace.vendor_id))
          end

        {access_token, email, agent, role, workspace}

      {{_email, ^agent_team_id, name, avatar_url}, _} ->
        # Slack user is native to the agent Slack app, but this is not the Slack (Agent) channel
        # Might be an agent posting in a shared channel

        shared_channel_helpdesk_associations =
          integration.specifics["shared_channel_helpdesk_associations"] || []

        case shared_channel_helpdesk_associations
             |> Enum.find(&(&1["shared_channel_id"] === channel_id)) do
          nil ->
            nil

          %{"helpdesk_id" => helpdesk_id} ->
            integration_tag = Slack.Agent.integration_tag_name(integration)
            %Data.Agent{} = agent = Repo.Agent.get_bot_by_tag_name(workspace_id, integration_tag)

            agent = %{agent | from_name_override: name, from_image_url_override: avatar_url}

            helpdesk_integration =
              load_helpdesk_integration(
                access_token: access_token,
                bot_user_info: bot_user_info,
                team_name: agent_team_name,
                team_id: agent_team_id,
                channel_id: channel_id,
                helpdesk_id: helpdesk_id
              )

            {agent, helpdesk_integration}
        end

      {{nil, other_team_id, name, avatar_url}, _} ->
        # Slack user (without email) is from another team - could be a customer posting in a shared channel

        shared_channel_helpdesk_associations =
          integration.specifics["shared_channel_helpdesk_associations"] || []

        case shared_channel_helpdesk_associations
             |> Enum.find(&(&1["shared_channel_id"] === channel_id)) do
          nil ->
            nil

          %{"helpdesk_id" => helpdesk_id} ->
            {:ok, %{"team" => %{"name" => team_name}}} =
              Slack.Api.team_info(access_token, other_team_id)

            integration_tag = Slack.Agent.integration_tag_name(integration)
            %Data.Agent{} = bot = Repo.Agent.get_bot_by_tag_name(workspace_id, integration_tag)

            bot = %{bot | from_name_override: "#{name} (U)", from_image_url_override: avatar_url}

            helpdesk_integration =
              load_helpdesk_integration(
                access_token: access_token,
                bot_user_info: bot_user_info,
                team_name: team_name,
                team_id: other_team_id,
                channel_id: channel_id,
                helpdesk_id: helpdesk_id
              )

            {bot, helpdesk_integration}
        end

      {{_email, other_team_id, _name, _avatar_url}, _} ->
        # Slack user is from another team - could be a customer posting in a shared channel

        shared_channel_helpdesk_associations =
          integration.specifics["shared_channel_helpdesk_associations"] || []

        case shared_channel_helpdesk_associations
             |> Enum.find(&(&1["shared_channel_id"] === channel_id)) do
          nil ->
            nil

          %{"helpdesk_id" => helpdesk_id} ->
            {:ok, %{"team" => %{"name" => team_name}}} =
              Slack.Api.team_info(access_token, other_team_id)

            %Data.User{} =
              user =
              Slack.Utils.resolve_fog_user_by_slack_user_id(
                access_token,
                other_team_id,
                slack_user_id,
                helpdesk_id
              )

            helpdesk_integration =
              load_helpdesk_integration(
                access_token: access_token,
                bot_user_info: bot_user_info,
                team_name: team_name,
                team_id: other_team_id,
                channel_id: channel_id,
                helpdesk_id: helpdesk_id
              )

            {user, helpdesk_integration}
        end

      _ ->
        nil
    end
  end

  defp slack_user_info(access_token, user_id) do
    user_info = Slack.Api.users_info(access_token, user_id)

    case user_info do
      {:ok,
       %{
         "ok" => true,
         "user" => %{
           # "is_email_confirmed" => true,
           "team_id" => team_id,
           "profile" => %{
             "email" => email,
             "real_name_normalized" => name,
             "image_24" => avatar_url
           }
         }
       }} ->
        {email, team_id, name, avatar_url}

      {:ok,
       %{
         "ok" => true,
         "user" => %{
           # "is_email_confirmed" => true,
           "team_id" => team_id,
           "profile" => %{
             "real_name_normalized" => name,
             "image_24" => avatar_url
           }
         }
       }} ->
        {nil, team_id, name, avatar_url}

      {:ok, x} ->
        Logger.error("slack_user_info match error: #{inspect(x)}")
        nil
    end
  end

  # NOTE: no email user_info example:
  _x = """
  %{
    "ok" => true,
    "user" => %{
      "color" => "9f69e7",
      "id" => "U02KA817W",
      "is_app_user" => false,
      "is_bot" => false,
      "is_stranger" => false,
      "name" => "andrei",
      "profile" => %{
        "avatar_hash" => "bb2d9962b783",
        "display_name" => "andrei",
        "display_name_normalized" => "andrei",
        "first_name" => "Andrei",
        "image_192" => "https://avatars.slack-edge.com/2015-03-05/3941692886_bb2d9962b783f2594ac6_24.jpg",
        "image_24" => "https://avatars.slack-edge.com/2015-03-05/3941692886_bb2d9962b783f2594ac6_24.jpg",
        "image_32" => "https://avatars.slack-edge.com/2015-03-05/3941692886_bb2d9962b783f2594ac6_24.jpg",
        "image_48" => "https://avatars.slack-edge.com/2015-03-05/3941692886_bb2d9962b783f2594ac6_24.jpg",
        "image_512" => "", "image_72" => "https://avatars.slack-edge.com/2015-03-05/3941692886_bb2d9962b783f2594ac6_24.jpg",
        "image_original" => "https://avatars.slack-edge.com/2015-03-05/3941692886_bb2d9962b783f2594ac6_original.jpg",
        "last_name" => "Soroker",
        "real_name" => "Andrei Soroker",
        "real_name_normalized" => "Andrei Soroker",
        "team" => "T02KA817U"
      },
      "team_id" => "T02KA817U",
      "updated" => 1603759414,
      "who_can_share_contact_card" => "EVERYONE"
    }
  }
  """

  defp mentioned_users(nil, _), do: []
  defp mentioned_users([], acc), do: acc

  defp mentioned_users([%{"elements" => elements} | t], acc),
    do: mentioned_users(t, mentioned_users(elements, acc))

  defp mentioned_users([%{"type" => "user"} = u | t], acc), do: mentioned_users(t, [u | acc])
  defp mentioned_users([_ | t], acc), do: mentioned_users(t, acc)

  defp resolve_slack_user_ids(slack_team_id, data) do
    agent_mappings =
      mentioned_users(data["blocks"], [])
      |> Enum.map(& &1["user_id"])
      |> Enum.map(&{&1, Repo.SlackAgentMapping.agent_id(slack_team_id, &1)})

    unknown =
      agent_mappings
      |> Enum.filter(fn
        {_, nil} -> true
        {_, _} -> false
      end)
      |> Enum.map(&(&1 |> elem(0)))

    known =
      agent_mappings
      |> Enum.filter(fn
        {_, nil} -> false
        {_, _} -> true
      end)
      |> Enum.map(&(&1 |> elem(1)))

    {unknown, known}
  end

  defp workspace_et_cetera(integration) do
    {access_token, team_id, user_info, linked_channel_id, wid} = specifics(integration)
    workspace = Repo.Workspace.get(wid) |> Repo.preload(vendor: :verified_domains)
    {access_token, team_id, user_info, linked_channel_id, workspace}
  end

  defp specifics(integration) do
    %Data.WorkspaceIntegration{
      specifics: %{
        "access_token" => access_token,
        "team_id" => team_id,
        "user_info" => user_info,
        "linked_channel_id" => linked_channel_id
      },
      workspace_id: wid
    } = integration

    {access_token, team_id, user_info, linked_channel_id, wid}
  end

  def load_helpdesk_integration(
        access_token: access_token,
        bot_user_info: bot_user_info,
        team_name: team_name,
        team_id: team_id,
        channel_id: channel_id,
        helpdesk_id: helpdesk_id
      ) do
    specifics = %{
      "access_token" => access_token,
      "user_info" => bot_user_info,
      # it's not always set for some reason
      "team_url" => "",
      "team_name" => team_name,
      "team_id" => team_id,
      "linked_channel_id" => channel_id
    }

    Data.HelpdeskIntegration
    |> Repo.load(%{
      helpdesk_id: helpdesk_id,
      type: "slack-customer",
      specifics: specifics
    })
    |> Repo.preload(:helpdesk)
  end
end
