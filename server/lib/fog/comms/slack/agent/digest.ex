defmodule Fog.Comms.Slack.Agent.Digest do
  import Fog.Gettext, only: [ngettext: 3]
  require EEx
  require Logger
  alias Fog.{Data, Repo}
  alias Fog.Comms.{Slack}

  @template2 "priv/emails/email_digest2"
  @token_exp 7 * 24 * 3600

  def send(%Data.EmailDigest{:to_type => "agent", agent: agent} = data) do
    Logger.info("Sending Slack digest to #{agent.email}")

    %Data.Agent{id: agent_id, email: email} = agent = agent |> Repo.preload(vendors: :vendor)
    vendors = agent.vendors |> Enum.map(&(&1.vendor |> Repo.preload(workspaces: :integrations)))
    workspaces = vendors |> Enum.flat_map(& &1.workspaces)

    workspaces
    |> Enum.each(fn workspace ->
      case workspace.integrations |> Enum.find(&(&1.type === "slack")) do
        nil ->
          :ok

        %Data.WorkspaceIntegration{} = integration ->
          handle_integration(agent_id, workspace, data, email, integration)
      end
    end)
  end

  def send(_), do: :ok

  EEx.function_from_file(:def, :md2, @template2 <> ".md.eex", [:data, :access_token])

  def md(%Data.EmailDigest{email_digest_template: "email_digest2"} = data, access_token),
    do: md2(data, access_token)

  def content_tag(tag, content, attrs) do
    Phoenix.HTML.Safe.to_iodata(Phoenix.HTML.Tag.content_tag(tag, content, attrs))
  end

  defp handle_integration(agent_id, workspace, data, email, %Data.WorkspaceIntegration{
         specifics: specifics
       }) do
    case {specifics["access_token"], specifics["team_id"]} do
      {nil, _} ->
        :ok

      {_, nil} ->
        :ok

      {access_token, slack_team_id} ->
        handle_specifics(agent_id, workspace, data, email, access_token, slack_team_id)
    end
  end

  defp handle_specifics(agent_id, workspace, data, email, access_token, slack_team_id) do
    case data.badges |> Enum.filter(&(&1.workspace_id == workspace.id)) do
      [] ->
        :ok

      badges ->
        slack_user_id = slack_user_id(access_token, email, agent_id, slack_team_id)

        case slack_user_id do
          nil ->
            :ok

          slack_user_id ->
            data1 = %{data | badges: badges}
            md_body = md(data1, access_token)

            Slack.Api.send_message(
              access_token,
              slack_user_id,
              # thread_id
              nil,
              # name,
              nil,
              # avatar_url,
              nil,
              md_body
            )
        end
    end
  end

  defp slack_user_id(access_token, email, agent_id, slack_team_id) do
    case Repo.SlackAgentMapping.slack_user_id(agent_id, slack_team_id) do
      nil ->
        case Slack.Api.users_list(access_token) do
          {:ok, %{"members" => members}} ->
            member =
              members
              |> Enum.find(fn
                %{"profile" => %{"email" => ^email}} ->
                  true

                _ ->
                  false
              end)

            case member do
              %{"id" => member_id} ->
                %Data.SlackAgentMapping{} =
                  Repo.SlackAgentMapping.create(
                    agent_id: agent_id,
                    slack_team_id: slack_team_id,
                    slack_user_id: member_id
                  )

                member_id

              _ ->
                nil
            end

          _ ->
            nil
        end

      slack_user_id ->
        slack_user_id
    end
  end

  defp author(%Data.Message{from_user: u, from_agent: a}), do: u || a

  defp author_name(%Data.Message{} = message) do
    author = author(message)
    message.from_name_override || author.name
  end

  defp fogbender_message_link(%Data.EmailDigest{to_type: "agent"}, b) do
    messageId = b.first_unread_message.id

    "#{Fog.env(:fog_storefront_url)}/admin/vendor/#{b.vendor_id}/" <>
      "workspace/#{b.workspace_id}/chat/#{b.room.id}/#{messageId}"
  end

  defp fogbender_message_link(%Data.EmailDigest{to_type: "user", user: %Data.User{id: id}}, b) do
    email_token = Fog.Token.for_email(id, @token_exp)

    "#{Fog.env(:fog_api_url)}/public/redirect_to_client/?#{URI.encode_query(%{token: email_token, room_id: b.room.id}, :rfc3986)}"
  end

  defp slack_message_link(access_token, b) do
    case Repo.SlackMessageMapping.slack_message(b.first_unread_message.id) do
      nil ->
        ""

      mappings ->
        mappings
        |> Enum.map(fn
          %Data.SlackMessageMapping{
            slack_channel_id: slack_channel_id,
            slack_message_ts: slack_message_ts
          } ->
            case Slack.Api.message_permalink(access_token, slack_channel_id, slack_message_ts) do
              {:ok, %{"permalink" => permalink}} ->
                "- <#{permalink}|Respond in Slack>"

              _ ->
                ""
            end
        end)
        |> Enum.join(" ")
    end
  end

  defp badge_room_name(%Data.Badge{room: %Data.Room{type: "dialog"}} = b) do
    "Dialog with #{author(b.first_unread_message).name}"
  end

  defp badge_room_name(b), do: b.room.name

  defp message_text(m), do: Fog.Email.Digest.message_text(m)

  defp t_new_messages(count), do: ngettext("_one new message_", "_%{count} new messages_", count)
  defp t_mentions(count), do: ngettext("_one mention_", "_%{count} mentions_", count)
  defp t_rooms(count), do: ngettext("_one room_", "_%{count} rooms_", count)
  defp t_more_rooms(count), do: ngettext("_one more room_", "_%{count} more rooms_", count)

  defp t_earlier_messages(count),
    do: ngettext("_one earlier message_", "_%{count} earlier messages_", count)

  defp t_unread_messages(count),
    do: ngettext("_one unread message_", "_%{count} unread messages_", count)
end
