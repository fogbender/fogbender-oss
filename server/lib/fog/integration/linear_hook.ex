defmodule Fog.Integration.LinearHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}

  use Task

  alias Fog.Integration.LinearHook

  defstruct [
    :widget_id,
    :data
  ]

  def consume(%LinearHook{widget_id: widget_id} = payload) when is_binary(widget_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%LinearHook{widget_id: widget_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    integration = get_integration(workspace, data)

    if not is_nil(integration) do
      Data.IntegrationLog.new(
        type: "linear",
        integration_id: integration.id,
        integration_project_id: integration.project_id,
        workspace_id: workspace.id,
        data: data
      )
      |> Repo.insert!()

      Issue.create_from_json(integration, data)

      case data["type"] do
        "Issue" ->
          handle_issue(workspace, integration, data)

        "Comment" ->
          handle_comment(workspace, integration, data)

        _ ->
          :ok
      end
    else
      Data.IntegrationLog.new(type: "linear", workspace_id: workspace.id, data: data)
      |> Repo.insert!()
    end
  end

  def run(_) do
    :ok
  end

  defp get_integration(workspace, data) do
    case data["data"]["teamId"] do
      nil ->
        case data["data"]["issueId"] do
          nil ->
            nil

          issue_id ->
            ii =
              Repo.get_by(Data.IntegrationIssue,
                issue_number: issue_id,
                workspace_id: workspace.id
              )

            Repo.get_by(Data.WorkspaceIntegration,
              type: "linear",
              project_id: ii.project_id,
              workspace_id: workspace.id
            )
        end

      team_id ->
        from(
          i in Data.WorkspaceIntegration,
          where: i.workspace_id == ^workspace.id,
          where: i.specifics["team_id"] == ^team_id
        )
        |> Repo.one()
    end
  end

  defp handle_issue(workspace, integration, data) do
    labels = data["data"]["labels"]

    if labels |> Enum.any?(&(&1["name"] == "fogbender")) do
      case data["action"] do
        action when action in ["create", "update"] ->
          {:ok, internal_room} = create_internal_issue_room(workspace, integration, data["data"])

          issue_tag = get_issue_tag(integration, data["data"])
          admin_issue_tag = get_admin_issue_tag(integration, data["data"])
          closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")
          open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")

          case data["data"]["state"]["type"] do
            type when type in ["canceled", "completed"] ->
              Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

              :ok = post_status_change_notification(workspace, integration, internal_room, data)

            type when type in ["started", "backlog"] ->
              Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])
              |> Enum.map(fn r ->
                Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)
              end)
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

              :ok = post_status_change_notification(workspace, integration, internal_room, data)

            _ ->
              []
          end

        _ ->
          :ok
      end
    else
      :ok
    end
  end

  defp handle_comment(workspace, integration, data) do
    admin_issue_tag = get_admin_issue_tag(integration, data["data"]["issue"])

    case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
      [room] ->
        integration_tag_name = Integration.Linear.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)
        comment_author = data["data"]["user"]["name"]
        comment = data["data"]["body"]

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: "#{comment_author}: #{comment}"
        }

        {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

      _ ->
        :ok
    end
  end

  def post_status_change_notification(workspace, integration, room, data) do
    token = Integration.Linear.token(integration)
    %{"team_id" => team_id} = integration.specifics

    case data["updatedFrom"]["stateId"] do
      nil ->
        :ok

      state_id ->
        {:ok, states} = Integration.Linear.get_workflow_states(token, team_id)
        from_state = states |> Enum.find(&(&1["node"]["id"] === state_id))
        to_state_name = data["data"]["state"]["name"]

        {:ok, %{"name" => by_name, "avatarUrl" => by_avatar_url}} =
          Integration.Linear.user_info(token, data["data"]["creatorId"])

        integration_tag_name = Integration.Linear.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

        text =
          "Changed issue status from **#{from_state["node"]["name"]}** to **#{to_state_name}**"

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: text,
          fromNameOverride: by_name,
          fromAvatarUrlOverride: by_avatar_url
        }

        {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

        :ok
    end
  end

  defp create_internal_issue_room(workspace, integration, issue) do
    internal_hid = Fog.Utils.internal_hid(workspace.id)

    room =
      Data.Room
      |> Repo.get_by(name: issue["title"], helpdesk_id: internal_hid)

    if is_nil(room) do
      integration_tag =
        Repo.get_by(Data.Tag,
          name: Integration.Linear.integration_tag_name(integration),
          workspace_id: workspace.id
        )

      issue_tag = get_issue_tag(integration, issue)
      admin_issue_tag = get_admin_issue_tag(integration, issue)

      try do
        room =
          Repo.Room.create(
            workspace.id,
            helpdesk_id: internal_hid,
            name: issue["title"],
            type: "public",
            tags: [integration_tag.id, issue_tag.id, admin_issue_tag.id]
          )

        :ok = Api.Event.publish(room)

        {:ok, room}
      rescue
        e ->
          Logger.error("Error: #{inspect(e)}")
          {:error, e}
      end
    else
      {:ok, room}
    end
  end

  defp get_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Linear.integration_tag_name(integration)}:#{issue["number"]}"
    )
  end

  defp get_admin_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Linear.integration_tag_name(integration)}:#{issue["number"]}:admin"
    )
  end
end
