defmodule Fog.Comms.Slack.Customer do
  @behaviour Fog.Integration.Behaviour

  import Ecto.Query

  alias Fog.{Api, Data, Repo}
  alias Fog.Comms.{Slack}

  def token(%Data.WorkspaceIntegration{} = i) do
    i.specifics["access_token"]
  end

  def token(%Data.HelpdeskIntegration{} = i) do
    i.specifics["access_token"]
  end

  def url(%Data.HelpdeskIntegration{} = i) do
    i.specifics["team_url"]
  end

  def url(%Data.WorkspaceIntegration{}) do
    "https://fogbender.com/blog/fogbender-slack-customer-integration"
  end

  def name(%Data.HelpdeskIntegration{} = i) do
    i.specifics["team_name"]
  end

  def name(%Data.WorkspaceIntegration{}) do
    "Documentation"
  end

  def integration_tag_name(%Data.HelpdeskIntegration{} = i) do
    i = i |> Repo.preload(helpdesk: :vendor)
    ":slack-customer:SC-#{i.helpdesk.vendor.id}"
  end

  def integration_tag_name(%Data.WorkspaceIntegration{} = i) do
    i = i |> Repo.preload(workspace: :vendor)
    ":slack-customer:SC-#{i.workspace.vendor.id}"
  end

  def commands(%Data.WorkspaceIntegration{}), do: ["init", "disconnect", "status"]
  def commands(%Data.HelpdeskIntegration{}), do: nil

  def initialize(connect_code, slack_code) do
    client_id = Fog.env(:slack_cust_client_id)
    client_secret = Fog.env(:slack_cust_client_secret)

    {:ok, data} = Slack.Api.oauth_code(slack_code, client_id, client_secret)

    case get_helpdesk_id(connect_code) do
      nil ->
        {:error, "Expired code - please create a new connect URL"}

      helpdesk_id ->
        helpdesk =
          Repo.Helpdesk.get(helpdesk_id)
          |> Repo.preload([:customer, :triage, :workspace, :vendor])

        case get_helpdesk_integration(helpdesk_id) do
          nil ->
            %{userToken: user_token, userInfo: user_info} = data

            {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

            linked_channel_name =
              helpdesk.vendor.name |> String.downcase() |> String.replace(~r/\s+/, "-")

            linked_channel_name = "#{linked_channel_name}-support"

            {:ok, team_info, nil} = Slack.Api.check_access(access_token)

            %{
              "team" => %{
                "id" => team_id,
                "name" => team_name,
                "url" => team_url
              }
            } = team_info

            specifics = %{
              "access_token" => access_token,
              "user_info" => user_info,
              "team_url" => team_url,
              "team_name" => team_name,
              "team_id" => team_id
              # "linked_channel_id" => channel_id
            }

            %Data.HelpdeskIntegration{} =
              integration = Repo.HelpdeskIntegration.add(helpdesk, "slack-customer", specifics)

            integration_tag_name = integration_tag_name(integration)

            _bot_agent =
              Repo.Agent.get_bot_by_tag_name(helpdesk.workspace_id, integration_tag_name)

            {:ok, linked_channel_name}

          %Data.HelpdeskIntegration{specifics: specifics} ->
            %{
              "linked_channel_id" => linked_channel_id,
              "access_token" => access_token
            } = specifics

            {:ok, channel_info} = Slack.Api.channel_info(access_token, linked_channel_id)

            %{"channel" => %{"name" => channel_name}} = channel_info

            {:error,
             "#{helpdesk.customer.name} is already connected to #{helpdesk.vendor.name} in ##{channel_name}. Please remove the Fogbender Customer app or run '@Fogbender Customer disconnect' in ##{channel_name} first"}
        end
    end
  end

  def set_channel(helpdesk_id, channel_name, channel_type) do
    case get_helpdesk_integration(helpdesk_id) do
      nil ->
        {:error, :no_integration}

      %Data.HelpdeskIntegration{specifics: specifics} = integration ->
        helpdesk =
          Repo.Helpdesk.get(helpdesk_id)
          |> Repo.preload([:customer, :triage, :workspace, :vendor])

        %{
          "access_token" => access_token,
          "user_info" => user_info
        } = specifics

        is_private =
          case channel_type do
            "private" ->
              true

            "public" ->
              false
          end

        {:ok,
         %{
           "channel" => %{
             "id" => channel_id
           }
         }} = Slack.Api.create_channel(access_token, channel_name, is_private: is_private)

        {:ok, _} =
          Slack.Api.set_channel_topic(
            access_token,
            channel_id,
            "🔴🟡🟢 ⚠ Warning! Agents from #{helpdesk.vendor.name} can see what you post in this channel"
          )

        integration
        |> Data.HelpdeskIntegration.update(
          specifics:
            Map.merge(specifics, %{
              "linked_channel_id" => channel_id
            })
        )
        |> Repo.update!()

        %{"userId" => user_id} = user_info

        {:ok, _} = Slack.Api.invite_user_to_channel(access_token, channel_id, user_id)

        integration_tag_name = ":slack-customer:SC-#{helpdesk.vendor.id}"

        bot_agent = Repo.Agent.get_bot_by_tag_name(helpdesk.workspace_id, integration_tag_name)

        bot_agent_sess = Api.Session.for_agent(helpdesk.vendor.id, bot_agent.id) |> Api.init()

        cmd = %Api.Message.Create{
          roomId: helpdesk.triage.id,
          text: "Connected. To disconnect, run '@Slack (Customer) disconnect'"
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

        :ok
    end
  end

  def get_workspace_integration(helpdesk_id) do
    from(
      i in Data.WorkspaceIntegration,
      join: w in assoc(i, :workspace),
      join: h in assoc(w, :helpdesks),
      on: h.id == ^helpdesk_id and i.type == "slack-customer"
    )
    |> Repo.one()
  end

  def get_helpdesk_id(connect_code) do
    from(
      c in Data.ConnectCode,
      where: c.code == ^connect_code,
      select: c.helpdesk_id
    )
    |> Repo.one()
  end

  def get_helpdesk_integration(helpdesk_id) do
    from(
      i in Data.HelpdeskIntegration,
      where: i.type == "slack-customer",
      where: i.helpdesk_id == ^helpdesk_id
    )
    |> Repo.one()
  end
end
