defmodule Fog.Integration.JiraHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}

  use Task

  alias Fog.Integration.JiraHook

  defstruct [
    :widget_id,
    :data
  ]

  def consume(%JiraHook{widget_id: widget_id} = payload) when is_binary(widget_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)
    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%JiraHook{widget_id: widget_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    project_key = data["issue"]["fields"]["project"]["key"]

    if not is_nil(project_key) do
      integration =
        from(
          i in Data.WorkspaceIntegration,
          where: i.workspace_id == ^workspace.id,
          where: i.project_id == ^to_string(project_key)
        )
        |> Repo.one()

      if not is_nil(integration) do
        # jira doesn't provide issue url data, so set it ourselves
        jira_url = integration.specifics["jira_url"]
        issue = data["issue"]
        issue_key = issue["key"]
        issue = Map.put(issue, "url", jira_url <> "/browse/" <> issue_key)
        data = %{data | "issue" => issue}

        Data.IntegrationLog.new(
          type: "jira",
          integration_id: integration.id,
          integration_project_id: integration.project_id,
          workspace_id: workspace.id,
          data: data
        )
        |> Repo.insert!()

        Issue.create_from_json(integration, data)

        case data["webhookEvent"] do
          event
          when event in ["jira:issue_created", "jira:issue_updated", "jira:issue_deleted"] ->
            closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")
            open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")
            admin_issue_tag = get_admin_issue_tag(integration, issue)
            issue_tag = get_issue_tag(integration, issue)

            {:ok, internal_room} =
              create_internal_issue_room(
                integration,
                issue
              )

            status_category = issue["fields"]["status"]["statusCategory"]["key"]

            case status_category do
              status when status in ["new", "indeterminate"] ->
                :ok = post_issue_update(workspace, integration, internal_room, data)

                Repo.Workspace.rooms_by_tag_ids(workspace.id, [
                  issue_tag.id,
                  admin_issue_tag.id
                ])
                |> Enum.map(fn r ->
                  Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)
                end)
                |> Enum.each(fn r ->
                  :ok = Api.Event.publish(r)
                end)

              "done" ->
                :ok = post_issue_update(workspace, integration, internal_room, data)

                Repo.Workspace.rooms_by_tag_ids(workspace.id, [
                  issue_tag.id,
                  admin_issue_tag.id
                ])
                |> Enum.each(fn r ->
                  :ok = Api.Event.publish(r)
                end)

              _ ->
                :ok
            end

          event when event in ["comment_created", "comment_updated", "comment_deleted"] ->
            {:ok, room} = create_internal_issue_room(integration, issue)

            :ok = post_comment_update(workspace, integration, room, data)

          _ ->
            :ok
        end
      else
        Data.IntegrationLog.new(type: "jira", workspace_id: workspace.id, data: data)
        |> Repo.insert!()
      end
    end
  end

  def post_issue_update(workspace, integration, room, data) do
    status_changelog =
      (data["changelog"]["items"] || []) |> Enum.find(&(&1["field"] === "status"))

    if status_changelog do
      by_name = data["user"]["displayName"]
      by_avatar_url = data["user"]["avatarUrls"][0]
      integration_tag_name = Integration.Jira.integration_tag_name(integration)
      bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
      bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id) |> Api.init()

      from_string = status_changelog["fromString"]
      to_string = status_changelog["toString"]

      if from_string do
        text = "Changed issue status from **#{from_string}** to **#{to_string}**"

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: text,
          fromNameOverride: by_name,
          fromAvatarUrlOverride: by_avatar_url
        }

        {:reply, %Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)
      end
    end

    :ok
  end

  defp post_comment_update(workspace, integration, room, data) do
    comment = format_rich_text(data["comment"]["body"])
    by_name = data["comment"]["author"]["displayName"]
    by_avatar_url = data["comment"]["author"]["avatarUrls"][0]
    integration_tag_name = Integration.Jira.integration_tag_name(integration)
    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
    bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

    cmd = %Api.Message.Create{
      roomId: room.id,
      text: comment,
      fromNameOverride: by_name,
      fromAvatarUrlOverride: by_avatar_url
    }

    {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

    :ok
  end

  defp format_rich_text(text) do
    text
    |> SimpleMarkdown.convert(
      parser: Fog.Integration.Jira.RichText.rules(),
      render: &Fog.Integration.Markdown.render/1
    )
  end

  defp create_internal_issue_room(integration, issue) do
    internal_hid = Fog.Utils.internal_hid(integration.workspace_id)

    issue_tag = get_issue_tag(integration, issue)

    room =
      Data.Room
      |> Repo.get_by(name: issue["fields"]["summary"], helpdesk_id: internal_hid)
      |> Repo.preload(tags: :tag)

    if is_nil(room) do
      admin_issue_tag = get_admin_issue_tag(integration, issue)

      try do
        room =
          Repo.Room.create(
            integration.workspace_id,
            helpdesk_id: internal_hid,
            name: issue["fields"]["summary"],
            type: "public",
            tags: [issue_tag.id, admin_issue_tag.id]
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

  defp get_admin_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Jira.integration_tag_name(integration)}:#{issue["key"]}:admin"
    )
  end

  defp get_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Jira.integration_tag_name(integration)}:#{issue["key"]}"
    )
  end
end
