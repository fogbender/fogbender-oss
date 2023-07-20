defmodule Fog.Comms.MsTeams.Hook do
  import Ecto.Query

  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Api, Data, FileUtils, Repo, Format}
  alias Fog.Comms.{MsTeams, Utils}

  use Task

  def consume(payload) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def run(%{"type" => "installationUpdate", "action" => "add"} = data) do
    %{
      "channelData" => %{
        "team" => %{
          "id" => team_id,
          "aadGroupId" => aad_group_id
        },
        "channel" => %{
          "id" => channel_id
        }
      }
    } = data

    %Data.MsTeamsTeamMapping{} =
      Data.MsTeamsTeamMapping.new(
        team_id: team_id,
        team_aad_group_id: aad_group_id
      )
      |> Repo.insert!(on_conflict: :nothing)

    case team_to_helpdesk_integration(aad_group_id) do
      nil ->
        :ok

      %Data.HelpdeskIntegration{helpdesk_id: helpdesk_id, specifics: specifics} ->
        %{
          "linked_channel_id" => linked_channel_id,
          "triage_conversation_id" => triage_conversation_id,
          "tenant_id" => tenant_id,
          "team_aad_group_id" => team_aad_group_id,
          "subscription_id" => subscription_id
        } = specifics

        case MsTeams.Api.delete_subscription(tenant_id, subscription_id) do
          {:ok, _} ->
            :ok

          :not_found ->
            :ok
        end

        helpdesk = Repo.Helpdesk.get(helpdesk_id)

        save_integration(
          tenant_id,
          team_aad_group_id,
          linked_channel_id,
          triage_conversation_id,
          helpdesk
        )

        :ok
    end

    response = """
      Thank you for installing the Fogbender Customer Microsoft Teams application! This application enables your vendors to provide you with customer support directly in a Microsoft Teams channel of your choice. If you were requested to install this application by one of your vendors, please ask this vendor for further connection instructions. If you have any questions, or would like to learn more about Fogbender, please visit https://fogbender.com or email [hello@fogbender.com](mailto:hello@fogbender.com).
    """

    {:ok, _} =
      MsTeams.Api.post_message(
        channel_id,
        response,
        "markdown"
      )

    :ok
  end

  def run(%{"type" => "message"} = data) do
    client_id = Fog.env(:msteams_client_id)

    try_commands(client_id, data)

    :ok
  end

  def run(%{"value" => subscription_events}) do
    process_subscription_events(subscription_events)
  end

  def run(_), do: :ok

  def process_subscription_events([]), do: :ok

  def process_subscription_events([e | t]) do
    :ok = process_subscription_event(e)
    process_subscription_events(t)
  end

  def process_subscription_event(%{"changeType" => "updated", "clientState" => secret} = event) do
    {:ok, data} = get_message_data(event)
    :ok = process_update(data, secret)
  end

  def process_subscription_event(%{"changeType" => "deleted", "clientState" => secret} = event) do
    {:ok, data} = get_message_data(event)
    :ok = process_delete(data, secret)
  end

  def process_subscription_event(%{"changeType" => "created", "clientState" => secret} = event) do
    {:ok, data} = get_message_data(event)

    %{
      "channelIdentity" => %{
        "channelId" => channel_id
      },
      "replyToId" => conversation_id,
      "from" => from,
      "id" => msteams_message_id,
      "mentions" => mentions
    } = data

    conversation_id =
      case conversation_id do
        nil ->
          msteams_message_id

        _ ->
          conversation_id
      end

    user =
      case from do
        %{"user" => user} -> user
        nil -> nil
      end

    # bot mentions are handled by MSBF webhooks
    is_bot_mentioned = is_bot_mentioned(mentions)

    if not is_nil(user) and is_bot_mentioned === false do
      case channel_to_integration(channel_id) do
        %Data.HelpdeskIntegration{helpdesk_id: hid, specifics: specifics} = integration ->
          %{
            "aes_256_key" => %{
              "key" => aes_256_key,
              "init_vec" => init_vec
            },
            "team_aad_group_id" => team_aad_group_id
          } = specifics

          [secret, aes_256_key, init_vec] =
            [secret, aes_256_key, init_vec]
            |> Enum.map(&(&1 |> Base.decode64(padding: false) |> elem(1)))

          case ExCrypto.decrypt(aes_256_key, init_vec, secret) do
            {:ok, ^hid} ->
              case conversation_to_room_id(integration, channel_id, conversation_id) do
                {:ok, integration, room_id} ->
                  room = Repo.Room.get(room_id) |> Repo.preload([:customer, :workspace])
                  %{"tenant_id" => tenant_id} = integration.specifics

                  {text, file_mappings, user_sess} =
                    handle_files(data, room, tenant_id, team_aad_group_id, channel_id)

                  :ok =
                    create_fog_message(
                      room,
                      text,
                      channel_id,
                      msteams_message_id,
                      user_sess,
                      file_mappings
                    )

                {:unknown_conversation, integration, ^msteams_message_id} ->
                  # top-level message, start new issue
                  :ok = handle_unknown_conversation(conversation_id, integration, data)

                {:unknown_conversation, _integration, ^conversation_id} ->
                  # message within an existing conversation, ignore
                  Logger.error("[msteams] Unrecognized conversation: #{inspect(conversation_id)}")
                  :ok

                nil ->
                  :ok
              end

            e ->
              Logger.error(
                "[msteams] Unrecognized clientState in MS Teams subscription: #{inspect(e)}"
              )

              :ok
          end

        _ ->
          Logger.error("[msteams] can't match channel to integration #{inspect(channel_id)}")
          :ok
      end
    else
      :ok
    end
  end

  def process_subscription_event(_), do: :ok

  def process_update(%{"reactions" => reactions} = data, secret) do
    %{
      "channelIdentity" => %{
        "channelId" => channel_id
      },
      "id" => msteams_message_id
    } = data

    case Repo.MsTeamsMessageMapping.mapping(msteams_message_id, channel_id) do
      nil ->
        :ok

      %Data.MsTeamsMessageMapping{
        message_id: message_id,
        msteams_message_meta: message_meta
      } ->
        case channel_to_integration(channel_id) do
          %Data.HelpdeskIntegration{helpdesk_id: hid, specifics: specifics} ->
            %{
              "aes_256_key" => %{
                "key" => aes_256_key,
                "init_vec" => init_vec
              },
              "tenant_id" => tenant_id,
              "team_aad_group_id" => team_aad_group_id
            } = specifics

            [secret, aes_256_key, init_vec] =
              [secret, aes_256_key, init_vec]
              |> Enum.map(&(&1 |> Base.decode64(padding: false) |> elem(1)))

            case ExCrypto.decrypt(aes_256_key, init_vec, secret) do
              {:ok, ^hid} ->
                message = Repo.Message.get(message_id) |> Repo.preload([:workspace, :customer])

                prev_reactions = message_meta["reactions"] || []

                curr_reactions =
                  fog_reactions(
                    [
                      workspace: message.workspace,
                      helpdesk_id: hid,
                      customer: message.customer,
                      tenant_id: tenant_id,
                      team_aad_group_id: team_aad_group_id
                    ],
                    reactions
                  )

                vendor_id = message.workspace.vendor_id

                Repo.MsTeamsMessageMapping.create(
                  message_id: message_id,
                  msteams_channel_id: channel_id,
                  msteams_message_id: msteams_message_id,
                  msteams_message_meta: Map.merge(message_meta, %{"reactions" => curr_reactions})
                )

                # remove these:
                prev_reactions
                |> Enum.filter(fn %{"user_id" => user_id} ->
                  is_nil(curr_reactions |> Enum.find(&(&1.user_id === user_id)))
                end)
                |> Enum.each(fn %{"user_id" => user_id} ->
                  :ok = post_fog_reaction(vendor_id, hid, user_id, message_id, nil)
                end)

                # add these:
                curr_reactions
                |> Enum.filter(fn %{user_id: user_id, reaction: reaction} ->
                  is_nil(
                    prev_reactions
                    |> Enum.find(&(&1["user_id"] === user_id and &1["reaction"] === reaction))
                  )
                end)
                |> Enum.each(fn %{user_id: user_id, reaction: reaction} ->
                  :ok = post_fog_reaction(vendor_id, hid, user_id, message_id, reaction)
                end)

                :ok

              e ->
                Logger.error(
                  "[msteams] Unrecognized clientState in MS Teams subscription: #{inspect(e)}"
                )

                :ok
            end

          _ ->
            :ok
        end
    end

    process_update(data |> Map.delete("reactions"), secret)
  end

  def process_update(data, secret) do
    %{
      "channelIdentity" => %{
        "channelId" => channel_id
      },
      "from" => %{
        "user" => user
      },
      "id" => msteams_message_id,
      "attachments" => attachments,
      "body" => %{
        "content" => content,
        "contentType" => content_type
      }
    } = data

    if not is_nil(user) do
      case Repo.MsTeamsMessageMapping.mapping(msteams_message_id, channel_id) do
        nil ->
          :ok

        %Data.MsTeamsMessageMapping{
          message_id: message_id,
          msteams_message_meta: message_meta
        } ->
          case channel_to_integration(channel_id) do
            %Data.HelpdeskIntegration{helpdesk_id: hid, specifics: specifics} ->
              %{
                "aes_256_key" => %{
                  "key" => aes_256_key,
                  "init_vec" => init_vec
                },
                "team_aad_group_id" => team_aad_group_id,
                "tenant_id" => tenant_id
              } = specifics

              [secret, aes_256_key, init_vec] =
                [secret, aes_256_key, init_vec]
                |> Enum.map(&(&1 |> Base.decode64(padding: false) |> elem(1)))

              case ExCrypto.decrypt(aes_256_key, init_vec, secret) do
                {:ok, ^hid} ->
                  message = Repo.Message.get(message_id) |> Repo.preload([:files])
                  room = Repo.Room.get(message.room_id) |> Repo.preload([:customer, :workspace])

                  {_text, image_urls} =
                    case {content_type, length(attachments) > 0} do
                      {"html", _} ->
                        Format.convert_with_images(content, Format.Html, Format.Md)

                      {_, true} ->
                        Format.convert_with_images(content, Format.Html, Format.Md)

                      _ ->
                        {content, [], []}
                    end

                  attachment_ids = attachments |> Enum.map(fn %{"id" => id} -> id end)

                  %{"file_mappings" => prev_file_mappings} = message_meta

                  file_mappings_to_remove =
                    prev_file_mappings
                    |> Enum.filter(fn
                      %{"attachment_id" => attachment_id} ->
                        is_nil(attachment_ids |> Enum.find(&(&1 === attachment_id)))

                      %{"url" => url} ->
                        is_nil(image_urls |> Enum.find(&(&1 == url)))
                    end)

                  known_image_urls =
                    image_urls
                    |> Enum.filter(fn url ->
                      prev_file_mappings
                      |> Enum.find(fn
                        %{"url" => ^url} ->
                          true

                        _ ->
                          nil
                      end)
                    end)

                  known_attachment_ids =
                    attachment_ids
                    |> Enum.filter(fn attachment_id ->
                      prev_file_mappings
                      |> Enum.find(fn
                        %{"attachment_id" => ^attachment_id} ->
                          true

                        _ ->
                          nil
                      end)
                    end)

                  {text, file_mappings_to_add, user_sess} =
                    handle_files(
                      data,
                      room,
                      tenant_id,
                      team_aad_group_id,
                      channel_id,
                      known_attachment_ids,
                      known_image_urls
                    )

                  curr_file_ids = (message.files || []) |> Enum.map(& &1.id)

                  file_ids_to_remove =
                    file_mappings_to_remove |> Enum.map(fn %{"file_id" => file_id} -> file_id end)

                  file_ids_to_add =
                    file_mappings_to_add |> Enum.map(fn %{"file_id" => file_id} -> file_id end)

                  file_ids = curr_file_ids -- file_ids_to_remove
                  file_ids = file_ids ++ file_ids_to_add

                  file_ids =
                    case {file_ids, curr_file_ids} do
                      {[], []} -> nil
                      _ -> file_ids
                    end

                  new_file_mappings =
                    prev_file_mappings
                    |> Enum.filter(fn %{"file_id" => file_id} ->
                      file_id not in file_ids_to_remove
                    end)

                  new_file_mappings = new_file_mappings ++ file_mappings_to_add

                  Repo.MsTeamsMessageMapping.create(
                    message_id: message_id,
                    msteams_channel_id: channel_id,
                    msteams_message_id: msteams_message_id,
                    msteams_message_meta:
                      Map.merge(message_meta, %{"file_mappings" => new_file_mappings})
                  )

                  case {curr_file_ids |> Enum.sort(), (file_ids || []) |> Enum.sort(), text,
                        message.text} do
                    {f, f, t, t} ->
                      :ok

                    _ ->
                      :ok = update_fog_message(message_id, text, file_ids, user_sess)
                  end

                e ->
                  Logger.error(
                    "[msteams] Unrecognized clientState in MS Teams subscription: #{inspect(e)}"
                  )

                  :ok
              end

            _ ->
              :ok
          end
      end
    end

    :ok
  end

  def process_delete(data, secret) do
    %{
      "channelIdentity" => %{
        "channelId" => channel_id
      },
      "id" => msteams_message_id,
      "from" => from
    } = data

    user =
      case from do
        %{"user" => user} -> user
        nil -> nil
      end

    if not is_nil(user) do
      case Repo.MsTeamsMessageMapping.mapping(msteams_message_id, channel_id) do
        nil ->
          :ok

        %Data.MsTeamsMessageMapping{message_id: message_id} ->
          case channel_to_integration(channel_id) do
            %Data.HelpdeskIntegration{helpdesk_id: hid, specifics: specifics} ->
              %{
                "aes_256_key" => %{
                  "key" => aes_256_key,
                  "init_vec" => init_vec
                },
                "tenant_id" => tenant_id,
                "team_aad_group_id" => team_aad_group_id
              } = specifics

              [secret, aes_256_key, init_vec] =
                [secret, aes_256_key, init_vec]
                |> Enum.map(&(&1 |> Base.decode64(padding: false) |> elem(1)))

              case ExCrypto.decrypt(aes_256_key, init_vec, secret) do
                {:ok, ^hid} ->
                  message = Repo.Message.get(message_id) |> Repo.preload(helpdesk: :customer)
                  helpdesk = message.helpdesk
                  room = Repo.Room.get(message.room_id) |> Repo.preload(:workspace)
                  %{"from" => %{"user" => %{"id" => user_id}}} = data

                  user =
                    fog_user(
                      helpdesk.workspace,
                      helpdesk.id,
                      helpdesk.customer,
                      tenant_id,
                      team_aad_group_id,
                      user_id
                    )

                  sess = get_user_session(room, user)
                  :ok = delete_fog_message(message_id, sess)

                e ->
                  Logger.error(
                    "[msteams] Unrecognized clientState in MS Teams subscription: #{inspect(e)}"
                  )

                  :ok
              end

            _ ->
              :ok
          end
      end
    else
      :ok
    end
  end

  def handle_unknown_conversation(conversation_id, integration, data) do
    %{
      "tenant_id" => tenant_id,
      "linked_channel_id" => linked_channel_id,
      "team_aad_group_id" => team_aad_group_id
    } = integration.specifics

    %{
      "from" => %{
        "user" => %{
          "id" => user_id
        }
      },
      "body" => %{
        "content" => content
      },
      "id" => msteams_message_id
    } = data

    text = Format.convert(content, Format.Html, Format.Md)

    new_issue_title = Fog.Utils.safe_text_to_issue_title(text)

    helpdesk =
      Repo.Helpdesk.get(integration.helpdesk_id)
      |> Repo.preload([:vendor, :workspace, :customer])

    workspace = Repo.Workspace.get(helpdesk.workspace.id) |> Repo.preload([:rooms])

    user =
      fog_user(
        helpdesk.workspace,
        helpdesk.id,
        helpdesk.customer,
        tenant_id,
        team_aad_group_id,
        user_id
      )

    room =
      Repo.Room.create(
        helpdesk.workspace.id,
        helpdesk_id: helpdesk.id,
        name: "F#{length(workspace.rooms) + 1} #{new_issue_title}",
        type: "public"
      )
      |> Repo.preload([:customer, :workspace])

    :ok = Api.Event.publish(room)

    %Data.MsTeamsChannelMapping{} =
      Repo.MsTeamsChannelMapping.create(
        room_id: room.id,
        channel_id: linked_channel_id,
        conversation_id: conversation_id
      )

    user_sess = get_user_session(room, user)

    :ok = create_fog_message(room, text, linked_channel_id, msteams_message_id, user_sess)

    response =
      "New conversation created: **#{room.name}** - #{helpdesk.vendor.name} support will reply to you here as soon as possible."

    unknown_conversation_id = "#{linked_channel_id};messageid=#{conversation_id}"

    {:ok, _} =
      MsTeams.Api.post_message(
        unknown_conversation_id,
        response,
        "markdown"
      )

    :ok
  end

  def is_bot_mentioned([]), do: false

  def is_bot_mentioned([%{"mentioned" => %{"application" => app_mention}} | t]) do
    client_id = Fog.env(:msteams_client_id)

    case app_mention do
      %{"id" => ^client_id} ->
        true

      _ ->
        is_bot_mentioned(t)
    end
  end

  def is_bot_mentioned([_ | t]) do
    is_bot_mentioned(t)
  end

  def get_message_data(event) do
    %{
      "resource" => resource,
      "subscriptionId" => subscription_id
    } = event

    case subscription_id_to_helpdesk_integration(subscription_id) do
      nil ->
        Logger.error("[msteams] Unknown helpdesk integration: #{event}")
        nil

      %Data.HelpdeskIntegration{} = integration ->
        %{
          "linked_channel_id" => linked_channel_id,
          "team_aad_group_id" => team_aad_group_id,
          "tenant_id" => tenant_id
        } = integration.specifics

        %{
          "channel_id" => ^linked_channel_id,
          "message_id" => message_id,
          "reply_id" => reply_id,
          "team_id" => ^team_aad_group_id
        } =
          Regex.named_captures(
            ~r/teams\('(?<team_id>[^']*)'\)\/channels\('(?<channel_id>[^']*)'\)\/messages\('(?<message_id>[^']*)'\)(\/replies\('(?<reply_id>[^']*)'\))?/,
            resource
          )

        reply_id =
          case reply_id do
            "" -> nil
            _ -> reply_id
          end

        {:ok, message_data} =
          MsTeams.Api.get_message(
            tenant_id,
            team_aad_group_id,
            linked_channel_id,
            message_id,
            reply_id
          )

        {:ok, message_data}
    end
  end

  def fog_user(workspace, helpdesk_id, customer, tenant_id, team_aad_group_id, msteams_user_id) do
    user =
      from(
        u in Data.User,
        join: m in Data.MsTeamsUserMapping,
        on:
          u.id == m.user_id and m.msteams_team_id == ^team_aad_group_id and
            m.msteams_user_id == ^msteams_user_id and m.helpdesk_id == ^helpdesk_id
      )
      |> Repo.one()

    case user do
      nil ->
        %{"displayName" => name, "mail" => mail, "userPrincipalName" => user_principal_name} =
          msteams_user(tenant_id, msteams_user_id)

        email = mail || user_principal_name

        user = get_helpdesk_user(workspace, customer, email, name)

        %Data.MsTeamsUserMapping{} =
          Data.MsTeamsUserMapping.new(
            user_id: user.id,
            msteams_team_id: team_aad_group_id,
            msteams_user_id: msteams_user_id,
            helpdesk_id: helpdesk_id
          )
          |> Repo.insert!()

        user

      %Data.User{} = user ->
        user
    end
  end

  def get_user_session(vendor_id, helpdesk_id, user_id) do
    Api.Session.for_user(
      vendor_id,
      helpdesk_id,
      user_id
    )
    |> Api.init()
  end

  def get_user_session(room, user) do
    get_user_session(
      room.workspace.vendor_id,
      user.helpdesk_id,
      user.id
    )
  end

  def conversation_to_room_id(integration, channel_id, conversation_id) do
    %{
      "linked_channel_id" => linked_channel_id,
      "triage_conversation_id" => triage_conversation_id
    } = integration.specifics

    case {channel_id, conversation_id} do
      {^linked_channel_id, ^triage_conversation_id} ->
        case Repo.MsTeamsChannelMapping.room_id(linked_channel_id, triage_conversation_id) do
          nil ->
            Logger.error(
              "msteams: Missing MsTeamsChannelMapping: #{inspect({channel_id, conversation_id})}"
            )

            nil

          room_id ->
            {:ok, integration, room_id}
        end

      {^linked_channel_id, cid} ->
        case Repo.MsTeamsChannelMapping.room_id(linked_channel_id, cid) do
          nil ->
            {:unknown_conversation, integration, cid}

          room_id ->
            {:ok, integration, room_id}
        end

      _ ->
        # unknown channel, skip it

        Logger.error("msteams: Unknown channel: #{inspect({channel_id, conversation_id})}")
        nil
    end
  end

  def get_helpdesk_user(workspace, customer, user_email, user_name) do
    Repo.User.import_external(
      workspace.vendor_id,
      workspace.id,
      customer.external_uid,
      user_email,
      {user_email, user_name, nil, customer.name}
    )
  end

  def msteams_user(tenant_id, user_id) do
    {:ok, data} = MsTeams.Api.get_user(tenant_id, user_id)
    data
  end

  def msteams_user(data) do
    %{
      "from" => %{"aadObjectId" => aad_object_id},
      "conversation" => %{"tenantId" => tenant_id}
    } = data

    {:ok, data} = MsTeams.Api.get_user(tenant_id, aad_object_id)
    data
  end

  defp channel_to_integration(channel_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: json_extract_path(i.specifics, ["linked_channel_id"]) == ^channel_id
    )
    |> Repo.one()
  end

  defp try_commands(client_id, data) do
    %{
      "conversation" => %{
        "id" => conversation_id,
        "tenantId" => tenant_id
      }
    } = data

    case try_commands({client_id, data["entities"], data}) do
      {:connected, channel_id, helpdesk} ->
        Logger.info("Connecting #{inspect({channel_id, helpdesk})}")

        %Data.Helpdesk{triage: triage, vendor: vendor, workspace_id: workspace_id} = helpdesk

        response =
          "**This is your #{vendor.name} Triage conversation - please reply here with your questions**"

        {:ok, %{"id" => new_conversation_id}} =
          MsTeams.Api.post_message(channel_id, response, "markdown")

        integration = add_integration({channel_id, new_conversation_id, helpdesk, data})

        integration_tag_name = MsTeams.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace_id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(vendor.id, bot_agent.id) |> Api.init()

        cmd = %Api.Message.Create{
          fromApp: "msteams",
          roomId: triage.id,
          text: "Connected"
        }

        {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(cmd, bot_agent_sess)

        consent_redirect_url = "#{Fog.env(:fog_api_url)}/public/msteams"

        consent_url =
          "https://login.microsoftonline.com/#{tenant_id}/v2.0/adminconsent?client_id=#{client_id}&state=12345&redirect_uri=#{consent_redirect_url}&scope=.default"

        response = """
        Connected! New conversation created: [#{helpdesk.vendor.name} Triage](https://teams.microsoft.com/l/message/#{channel_id}/#{new_conversation_id}?tenantId=#{tenant_id})  \n

        **IMPORTANT**: [Click here to provide admin consent to the Fogbender app](#{consent_url})
        """

        {:ok, _} =
          MsTeams.Api.post_message(
            conversation_id,
            response,
            "markdown"
          )

        :done

      {:disconnected, integration} ->
        Logger.info("Disconnected: #{inspect(integration)}")

        {:ok, bot_agent_sess, helpdesk} =
          post_fog_bot_message(integration, "Customer initiated disconnect - disconnecting...")

        {:ok, %{"id" => _new_conversation_id}} =
          MsTeams.Api.post_message(conversation_id, "Disconnected", "markdown")

        :ok = delete_integration(integration)

        :ok = post_fog_bot_message(helpdesk.triage.id, "Disconnected", bot_agent_sess)

      :not_connected ->
        Logger.info("Not connected")

        response = "Channel not connected"

        {:ok, _} = MsTeams.Api.post_message(conversation_id, response, "markdown")
        :done

      {:response, response} ->
        Logger.info("Response: #{inspect(response)}")
        {:ok, _} = MsTeams.Api.post_message(conversation_id, response, "markdown")
        :done

      r ->
        Logger.info("try_commands: #{inspect(r)}")
        :continue
    end
  end

  defp try_commands(
         {client_id,
          [%{"mentioned" => mention, "type" => "mention", "text" => mentioned_text} | t], data}
       ) do
    case mention["id"] |> String.split(":") do
      [_, ^client_id] ->
        %{
          "text" => text,
          "channelData" => %{
            "channel" => %{"id" => channel_id},
            "team" => %{"id" => team_id}
          }
        } = data

        text = text |> String.replace("\n", "") |> String.trim()

        case text |> String.split(~r{#{mentioned_text}[ ]?}) do
          [_, "connect " <> code] ->
            case from(c in Data.ConnectCode, where: c.code == ^code, select: c.helpdesk_id)
                 |> Repo.one() do
              nil ->
                {:response,
                 "'#{code}' is not a valid code - please ask your vendor for valid one"}

              helpdesk_id ->
                helpdesk =
                  Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:triage, :workspace, :vendor])

                case team_id_to_aad_group_id(team_id) do
                  nil ->
                    {:connected, channel_id, helpdesk}

                  team_aad_group_id ->
                    case team_and_channel_to_helpdesk_integration(team_aad_group_id, channel_id) do
                      nil ->
                        case team_and_helpdesk_to_helpdesk_integration(
                               team_aad_group_id,
                               helpdesk_id
                             ) do
                          nil ->
                            {:connected, channel_id, helpdesk}

                          %Data.HelpdeskIntegration{specifics: specifics} ->
                            %{
                              "tenant_id" => tenant_id,
                              "linked_channel_id" => linked_channel_id,
                              "triage_conversation_id" => triage_conversation_id
                            } = specifics

                            # This team is already connected to this helpdesk - point to channel

                            response =
                              "This team is already connected to #{helpdesk.vendor.name} - [click here to open Triage](https://teams.microsoft.com/l/message/#{linked_channel_id}/#{triage_conversation_id}?tenantId=#{tenant_id})"

                            {:response, response}
                        end

                      %Data.HelpdeskIntegration{helpdesk_id: helpdesk_id, specifics: specifics} ->
                        %{
                          "tenant_id" => tenant_id,
                          "linked_channel_id" => linked_channel_id,
                          "triage_conversation_id" => triage_conversation_id
                        } = specifics

                        helpdesk =
                          Repo.Helpdesk.get(helpdesk_id)
                          |> Repo.preload([:triage, :workspace, :vendor])

                        # This channel is already connected to a helpdesk

                        response =
                          "This channel is already connected to #{helpdesk.vendor.name} - [click here to open Triage](https://teams.microsoft.com/l/message/#{linked_channel_id}/#{triage_conversation_id}?tenantId=#{tenant_id}). To disconnect, type '**@Fogbender** disconnect'"

                        {:response, response}
                    end
                end
            end

          [_, "disconnect"] ->
            case team_id_to_aad_group_id(team_id) do
              nil ->
                :not_connected

              team_aad_group_id ->
                case team_and_channel_to_helpdesk_integration(team_aad_group_id, channel_id) do
                  nil ->
                    :not_connected

                  integration ->
                    {:disconnected, integration}
                end
            end

          [_, "status"] ->
            case team_id_to_aad_group_id(team_id) do
              nil ->
                {:response, "This channel is not connected"}

              team_aad_group_id ->
                case team_and_channel_to_helpdesk_integration(team_aad_group_id, channel_id) do
                  nil ->
                    :not_connected

                  %{helpdesk_id: helpdesk_id} ->
                    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor])
                    {:response, "Connected to #{helpdesk.vendor.name}"}
                end
            end

          [_, "help"] ->
            {:response, "Available commands: connect [code], disconnect, status, help"}

          [_, "connect"] ->
            {:response,
             "The 'connect' command requires a code - please ask your vendor to generate one for you"}

          [_, command] ->
            {:response, "Unknown command: #{command}. Try '@Fogbender help' for help."}

          _ ->
            {:response, "Unknown command. Try '@Fogbender help' for help."}
        end

      _ ->
        try_commands({client_id, t, data})
    end
  end

  defp try_commands(_), do: :ok

  defp add_integration(
         {channel_id, triage_conversation_id, %Data.Helpdesk{triage: triage} = helpdesk, data}
       ) do
    %Data.MsTeamsChannelMapping{} =
      Repo.MsTeamsChannelMapping.create(
        room_id: triage.id,
        channel_id: channel_id,
        conversation_id: triage_conversation_id
      )

    %{
      "conversation" => %{"tenantId" => tenant_id},
      "channelData" => %{
        "team" => %{"id" => team_id}
      }
    } = data

    team_aad_group_id = team_id_to_aad_group_id(team_id)

    save_integration(tenant_id, team_aad_group_id, channel_id, triage_conversation_id, helpdesk)
  end

  def save_integration(tenant_id, team_aad_group_id, channel_id, triage_conversation_id, helpdesk) do
    {:ok, subscription_id, aes_256_key} =
      MsTeams.Subscription.add_subscription(tenant_id, team_aad_group_id, channel_id, helpdesk.id)

    case subscription_id do
      nil ->
        :error

      _ ->
        specifics = %{
          "linked_channel_id" => channel_id,
          "triage_conversation_id" => triage_conversation_id,
          "tenant_id" => tenant_id,
          "team_aad_group_id" => team_aad_group_id,
          "subscription_id" => subscription_id,
          "aes_256_key" => aes_256_key
        }

        %Data.HelpdeskIntegration{} = Repo.HelpdeskIntegration.add(helpdesk, "msteams", specifics)
    end
  end

  def delete_integration(integration) do
    %{
      "subscription_id" => subscription_id,
      "tenant_id" => tenant_id
    } = integration.specifics

    resp = MsTeams.Api.delete_subscription(tenant_id, subscription_id)

    true = resp in [:not_found, :ok]

    %Data.HelpdeskIntegration{} = Repo.HelpdeskIntegration.delete(integration)

    :ok
  end

  def team_id_to_aad_group_id(team_id) do
    from(
      m in Data.MsTeamsTeamMapping,
      where: m.team_id == ^team_id,
      select: m.team_aad_group_id
    )
    |> Repo.one()
  end

  def subscription_id_to_helpdesk_integration(subscription_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: json_extract_path(i.specifics, ["subscription_id"]) == ^subscription_id
    )
    |> Repo.one()
  end

  def team_and_helpdesk_to_helpdesk_integration(team_aad_group_id, helpdesk_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: json_extract_path(i.specifics, ["team_aad_group_id"]) == ^team_aad_group_id,
      where: i.helpdesk_id == ^helpdesk_id
    )
    |> Repo.one()
  end

  def team_and_channel_to_helpdesk_integration(team_aad_group_id, channel_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: json_extract_path(i.specifics, ["team_aad_group_id"]) == ^team_aad_group_id,
      where: json_extract_path(i.specifics, ["linked_channel_id"]) == ^channel_id
    )
    |> Repo.one()
  end

  def team_to_helpdesk_integration(team_aad_group_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: i.type == "msteams",
      where: json_extract_path(i.specifics, ["team_aad_group_id"]) == ^team_aad_group_id
    )
    |> Repo.one()
  end

  def create_fog_message(room, text, channel_id, msteams_message_id, sess, file_mappings \\ []) do
    file_ids = file_mappings |> Enum.map(fn %{"file_id" => file_id} -> file_id end)

    cmd = %Api.Message.Create{
      fromApp: "msteams",
      roomId: room.id,
      text: text,
      fileIds: file_ids
    }

    {:reply, %Api.Message.Ok{messageId: message_id}, _} = Api.request(cmd, sess)

    %Data.MsTeamsMessageMapping{} =
      Repo.MsTeamsMessageMapping.create(
        message_id: message_id,
        msteams_channel_id: channel_id,
        msteams_message_id: msteams_message_id,
        msteams_message_meta: %{
          "file_mappings" => file_mappings
        }
      )

    :ok
  end

  def update_fog_message(message_id, text, file_ids, sess) do
    cmd = %Api.Message.Update{
      messageId: message_id,
      fromApp: "msteams",
      text: text,
      fileIds: file_ids
    }

    {:reply, %Api.Message.Ok{messageId: ^message_id}, _} = Api.request(cmd, sess)

    :ok
  end

  def delete_fog_message(message_id, sess) do
    cmd = %Api.Message.Update{
      messageId: message_id,
      fromApp: "msteams",
      text: nil
    }

    {:reply, %Api.Message.Ok{messageId: ^message_id}, _} = Api.request(cmd, sess)

    :ok
  end

  def fog_reactions(_tate, []), do: []

  def fog_reactions(state, reactions), do: fog_reactions(state, [], reactions)

  def fog_reactions(_tate, acc, []), do: acc

  def fog_reactions(state, acc, [%{"user" => %{"user" => nil}} | t]),
    do: fog_reactions(state, acc, t)

  def fog_reactions(state, acc, [reaction | t]) do
    %{
      "user" => %{
        "user" => %{
          "id" => user_id
        }
      },
      "reactionType" => reaction_type
    } = reaction

    fog_user =
      fog_user(
        state[:workspace],
        state[:helpdesk_id],
        state[:customer],
        state[:tenant_id],
        state[:team_aad_group_id],
        user_id
      )

    fog_reaction = %{
      user_id: fog_user.id,
      reaction: Utils.to_fog_reaction(reaction_type)
    }

    fog_reactions(state, [fog_reaction | acc], t)
  end

  def post_fog_reaction(vendor_id, helpdesk_id, user_id, message_id, reaction) do
    sess = get_user_session(vendor_id, helpdesk_id, user_id)

    cmd = %Api.Message.SetReaction{
      fromApp: "msteams",
      messageId: message_id,
      reaction: reaction
    }

    {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, sess)

    :ok
  end

  def attachments_to_file_mappings(_tate, []), do: nil

  def attachments_to_file_mappings(state, attachments) do
    {:ok, folder_info} =
      MsTeams.Api.get_files_folder(state[:tenant_id], state[:team_id], state[:channel_id])

    %{
      "id" => folder_id,
      "parentReference" => %{
        "driveId" => drive_id
      }
    } = folder_info

    {:ok, folder_items} = MsTeams.Api.get_folder_items(state[:tenant_id], drive_id, folder_id)

    attachments_to_file_mappings(state ++ [folder_items: folder_items], [], attachments)
    |> Enum.reverse()
  end

  def attachments_to_file_mappings(_tate, acc, []), do: acc

  def attachments_to_file_mappings(state, acc, [attachment | t]) do
    file_mapping = attachment_to_file_mapping(state, attachment)
    attachments_to_file_mappings(state, [file_mapping | acc], t)
  end

  def attachment_to_file_mapping(state, attachment) do
    %{
      "id" => attachment_id,
      "name" => name
    } = attachment

    {:ok, binary} =
      MsTeams.Api.download_drive_item(state[:tenant_id], state[:folder_items], attachment_id)

    file_id = binary_to_file_id(name, state, binary)
    %{"file_id" => file_id, "attachment_id" => attachment_id}
  end

  def binary_to_file_id(name, state, binary) do
    content_type = FileUtils.content_type(binary)

    cmd = %Api.File.Upload{
      roomId: state[:room_id],
      fileName: name,
      fileType: content_type,
      # to emulate websocket binary data
      binaryData: {0, binary}
    }

    {:reply, %Api.File.Ok{fileId: file_id}} = Api.File.info(cmd, state[:sess].session)

    file_id
  end

  def handle_files(
        data,
        room,
        tenant_id,
        team_aad_group_id,
        channel_id,
        known_attachment_ids \\ [],
        known_image_urls \\ []
      ) do
    %{
      "from" => %{
        "user" => %{
          "id" => user_id
        }
      },
      "body" => %{
        "content" => content,
        "contentType" => content_type
      },
      "attachments" => attachments
    } = data

    {text, image_urls} =
      case {content_type, length(attachments) > 0} do
        {"html", _} ->
          Format.convert_with_images(content, Format.Html, Format.Md)

        {_, true} ->
          Format.convert_with_images(content, Format.Html, Format.Md)

        _ ->
          {content, []}
      end

    attachments =
      attachments |> Enum.filter(fn %{"id" => id} -> id not in known_attachment_ids end)

    image_urls = image_urls |> Enum.filter(fn url -> url not in known_image_urls end)

    user =
      fog_user(
        room.workspace,
        room.helpdesk_id,
        room.customer,
        tenant_id,
        team_aad_group_id,
        user_id
      )

    user_sess = get_user_session(room, user)

    state = [
      tenant_id: tenant_id,
      team_id: team_aad_group_id,
      channel_id: channel_id,
      room_id: room.id,
      sess: user_sess
    ]

    file_mappings0 =
      image_urls
      |> Enum.map(fn url ->
        {:ok, binary} = MsTeams.Api.download_from_url(tenant_id, url)
        extension = FileUtils.extension(binary)
        %{"file_id" => binary_to_file_id("upload#{extension}", state, binary), "url" => url}
      end)

    file_mappings1 = attachments_to_file_mappings(state, attachments)

    file_mappings =
      case {file_mappings0, file_mappings1} do
        {nil, nil} -> nil
        {nil, mappings} -> mappings
        {mappings, nil} -> mappings
        {mappings0, mappings1} -> mappings0 ++ mappings1
      end

    text =
      case {file_mappings, String.length(text)} do
        {_, text_length} when text_length > 0 ->
          text

        {file_mappings, 0} when is_list(file_mappings) and length(file_mappings) > 0 ->
          ""

        _ ->
          text
      end

    {text, file_mappings, user_sess}
  end

  def post_fog_bot_message(integration, text) do
    %{helpdesk_id: helpdesk_id} = integration
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor, :triage])

    integration_tag_name = MsTeams.integration_tag_name(integration)
    bot_agent = Repo.Agent.get_bot_by_tag_name(helpdesk.workspace_id, integration_tag_name)

    bot_agent_sess = Api.Session.for_agent(helpdesk.vendor.id, bot_agent.id) |> Api.init()

    cmd = %Api.Message.Create{
      fromApp: "msteams",
      roomId: helpdesk.triage.id,
      text: text
    }

    {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

    {:ok, bot_agent_sess, helpdesk}
  end

  def post_fog_bot_message(room_id, text, bot_agent_sess) do
    cmd = %Api.Message.Create{
      fromApp: "msteams",
      roomId: room_id,
      text: text
    }

    {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

    :ok
  end
end
