defmodule Fog.Integration.GitHubHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}
  alias Fog.Integration.{GitHub}

  use Task

  alias Fog.Integration.GitHubHook

  defstruct [
    :widget_id,
    :data
  ]

  def consume(%GitHubHook{widget_id: widget_id} = payload) when is_binary(widget_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%GitHubHook{widget_id: widget_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    repository_id = data["repository"]["id"]

    if not is_nil(repository_id) do
      integration =
        from(
          i in Data.WorkspaceIntegration,
          where: i.workspace_id == ^workspace.id,
          where: i.specifics["repository_id"] == ^repository_id,
          where: i.type == "github"
        )
        |> Repo.one()

      labels = data["issue"]["labels"]

      if not is_nil(integration) && not is_nil(labels) do
        Data.IntegrationLog.new(
          type: "github",
          integration_id: integration.id,
          integration_project_id: integration.project_id,
          workspace_id: workspace.id,
          data: data
        )
        |> Repo.insert!()

        Issue.create_from_json(integration, data)

        if labels |> Enum.any?(&(&1["name"] == "fogbender")) do
          closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")
          open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")
          admin_issue_tag = get_admin_issue_tag(integration, data["issue"])
          issue_tag = get_issue_tag(integration, data["issue"])

          case data["action"] do
            "opened" ->
              {:ok, room} = create_internal_issue_room(workspace, integration, data["issue"])
              :ok = post_issue_update(workspace, integration, room, data)

              Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])
              |> Enum.map(fn r ->
                Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)
              end)
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

            "closed" ->
              case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
                [] ->
                  Logger.error("Couldn't find an internal room for #{inspect(admin_issue_tag)}")

                [internal_room] ->
                  :ok = post_notification(workspace, integration, internal_room, data)
              end

              :ok = publish_rooms_by_tags(workspace.id, [issue_tag.id])

            "reopened" ->
              Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])
              |> Enum.map(fn r ->
                Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)
              end)
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

              case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
                [] ->
                  Logger.error("Couldn't find an internal room for #{inspect(admin_issue_tag)}")

                [internal_room] ->
                  :ok = post_notification(workspace, integration, internal_room, data)
              end

              :ok = publish_rooms_by_tags(workspace.id, [issue_tag.id])

            "created" ->
              {:ok, room} = create_internal_issue_room(workspace, integration, data["issue"])
              :ok = post_notification(workspace, integration, room, data)

            "labeled" ->
              {:ok, room} = create_internal_issue_room(workspace, integration, data["issue"])

              case "#{data["label"]["name"]}" do
                "fogbender" ->
                  :ok

                tag_name ->
                  label_tag = Repo.Tag.create(workspace.id, tag_name)
                  %Fog.Data.Room{} = Repo.Room.update_tags(room.id, [label_tag.id], [], nil, nil)
                  :ok = Integration.publish_recently_tagged_rooms(integration, label_tag)
              end

            _ ->
              case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
                [] ->
                  Logger.error("Couldn't find an internal room for #{inspect(admin_issue_tag)}")
                  :ok

                [internal_room] ->
                  :ok = post_notification(workspace, integration, internal_room, data)
              end
          end
        end
      else
        Data.IntegrationLog.new(type: "github", workspace_id: workspace.id, data: data)
        |> Repo.insert!()

        :ok
      end
    end
  end

  defp post_issue_update(workspace, integration, room, data) do
    action = data["action"]
    issue_title = data["issue"]["title"]
    issue_url = data["issue"]["html_url"]
    by_name = data["issue"]["user"]["login"]
    integration_tag_name = GitHub.integration_tag_name(integration)

    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)

    bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id) |> Api.init()

    cmd = %Api.Message.Create{
      roomId: room.id,
      text: "#{issue_title} #{action} by #{by_name} #{issue_url}"
    }

    {:reply, %Fog.Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

    :ok
  end

  defp post_notification(workspace, integration, room, data) do
    action = data["action"]
    issue_title = data["issue"]["title"]
    issue_url = data["issue"]["html_url"]
    issue_number = data["issue"]["number"]
    by_name = data["sender"]["login"]
    by_avatar_url = data["sender"]["avatar_url"]

    text =
      case action do
        "reopened" ->
          "Reopened [#{issue_title} (##{issue_number})](#{issue_url})"

        "closed" ->
          "Closed [#{issue_title} (##{issue_number})](#{issue_url})"

        "commented" ->
          data["comment"]["body"] |> Fog.Format.convert(Fog.Format.Html, Fog.Format.Plain)

        "created" ->
          # not in the docs
          data["comment"]["body"] |> Fog.Format.convert(Fog.Format.Html, Fog.Format.Plain)

        "assigned" ->
          assignee_name = data["assignee"]["login"]
          assignee_url = data["assignee"]["html_url"]
          "Assigned [#{assignee_name}](#{assignee_url})"

        "unassigned" ->
          assignee_name = data["assignee"]["login"]
          assignee_url = data["assignee"]["html_url"]
          "Unassigned [#{assignee_name}](#{assignee_url})"

        _ ->
          nil
      end

    case text do
      nil ->
        :ok

      _ ->
        integration_tag_name = GitHub.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: text,
          fromNameOverride: by_name,
          fromAvatarUrlOverride: by_avatar_url,
          fromApp: "github"
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

    issue_tag = get_issue_tag(integration, issue)

    add_status_tag =
      case issue["state"] do
        "open" ->
          Repo.Tag.create(integration.workspace_id, ":status:open")

        "closed" ->
          Repo.Tag.create(integration.workspace_id, ":status:closed")

        _ ->
          Repo.Tag.create(integration.workspace_id, ":issue")
      end

    remove_status_tag =
      case issue["state"] do
        "open" ->
          Repo.Tag.create(integration.workspace_id, ":status:closed")

        "closed" ->
          Repo.Tag.create(integration.workspace_id, ":status:open")

        _ ->
          Repo.Tag.create(integration.workspace_id, ":noop")
      end

    {:ok, room} =
      if is_nil(room) do
        admin_issue_tag = get_admin_issue_tag(integration, issue)

        try do
          room =
            Repo.Room.create(
              workspace.id,
              helpdesk_id: internal_hid,
              name: issue["title"],
              type: "public",
              tags: [issue_tag.id, admin_issue_tag.id, add_status_tag.id]
            )

          {:ok, room}
        rescue
          e ->
            case e do
              %Ecto.InvalidChangesetError{
                action: :insert,
                changeset: %{
                  errors: [
                    name:
                      {"has already been taken",
                       [constraint: :unique, constraint_name: "room_helpdesk_id_name_index"]}
                  ]
                }
              } ->
                %Data.Room{} =
                  room = Data.Room |> Repo.get_by(name: issue["title"], helpdesk_id: internal_hid)

                {:ok, room}

              e ->
                Logger.error("Error: #{inspect(e)}")
                {:error, e}
            end
        end
      else
        {:ok, room}
      end

    room =
      Repo.Room.update_tags(
        room.id,
        [issue_tag.id, add_status_tag.id],
        [remove_status_tag.id],
        nil,
        nil
      )

    :ok = Api.Event.publish(room)

    {:ok, room}
  end

  defp get_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.GitHub.integration_tag_name(integration)}:#{issue["number"]}"
    )
  end

  defp get_admin_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.GitHub.integration_tag_name(integration)}:#{issue["number"]}:admin"
    )
  end

  defp publish_rooms_by_tags(workspace_id, tag_ids) do
    Repo.Workspace.rooms_by_tag_ids(workspace_id, tag_ids)
    |> Enum.each(fn r ->
      :ok = Api.Event.publish(r)
    end)

    :ok
  end
end
