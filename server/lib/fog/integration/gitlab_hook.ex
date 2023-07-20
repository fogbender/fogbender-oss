defmodule Fog.Integration.GitLabHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}
  alias Fog.Integration.{GitLab}

  use Task

  alias Fog.Integration.GitLabHook

  defstruct [
    :widget_id,
    :data
  ]

  def consume(%GitLabHook{widget_id: widget_id} = payload) when is_binary(widget_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%GitLabHook{widget_id: widget_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    project_id = data["object_attributes"]["project_id"]

    if not is_nil(project_id) do
      from(
        i in Data.WorkspaceIntegration,
        where: i.workspace_id == ^workspace.id
      )
      |> Repo.all()

      integration =
        from(
          i in Data.WorkspaceIntegration,
          where: i.workspace_id == ^workspace.id,
          where: i.project_id == ^to_string(project_id)
        )
        |> Repo.one()

      labels = data["labels"] || data["issue"]["labels"]

      if not is_nil(integration) && not is_nil(labels) do
        Data.IntegrationLog.new(
          type: "gitlab",
          integration_id: integration.id,
          integration_project_id: integration.project_id,
          workspace_id: workspace.id,
          data: data
        )
        |> Repo.insert!()

        Issue.create_from_json(integration, data)

        if labels |> Enum.any?(&(&1["title"] == "fogbender")) do
          closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")
          open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")
          admin_issue_tag = get_admin_issue_tag(integration, data["object_attributes"])
          issue_tag = get_issue_tag(integration, data["object_attributes"])

          case data["event_type"] do
            "issue" ->
              {:ok, room} =
                create_internal_issue_room(
                  workspace,
                  integration,
                  data["object_attributes"]
                )

              case {data["object_attributes"]["action"], data["object_kind"]} do
                {"open", _} ->
                  :ok = post_issue_update(workspace, integration, room, data)

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

                {"close", _} ->
                  case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
                    [] ->
                      Logger.error(
                        "Couldn't find an internal room for #{inspect(admin_issue_tag)}"
                      )

                    [internal_room] ->
                      :ok = post_notification(workspace, integration, internal_room, data)
                  end

                  :ok = publish_rooms_by_tags(workspace.id, [issue_tag.id])

                {"reopen", _} ->
                  Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])
                  |> Enum.map(fn r ->
                    Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)
                  end)
                  |> Enum.each(fn r ->
                    :ok = Api.Event.publish(r)
                  end)

                  case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
                    [] ->
                      Logger.error(
                        "Couldn't find an internal room for #{inspect(admin_issue_tag)}"
                      )

                    [internal_room] ->
                      :ok = post_notification(workspace, integration, internal_room, data)
                  end

                  :ok = publish_rooms_by_tags(workspace.id, [issue_tag.id])

                {"update", "issue"} ->
                  case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
                    [] ->
                      Logger.error(
                        "Couldn't find an internal room for #{inspect(admin_issue_tag)}"
                      )

                    [internal_room] ->
                      :ok = post_notification(workspace, integration, internal_room, data)
                  end

                _ ->
                  []
              end

            "note" ->
              {:ok, room} = create_internal_issue_room(workspace, integration, data["issue"])

              :ok = post_note_update(workspace, integration, room, data)

            _ ->
              :ok
          end
        end
      else
        Data.IntegrationLog.new(type: "gitlab", workspace_id: workspace.id, data: data)
        |> Repo.insert!()

        :ok
      end
    end
  end

  defp post_issue_update(workspace, integration, room, data) do
    action = data["object_attributes"]["action"]
    issue_title = data["object_attributes"]["title"]
    issue_url = data["object_attributes"]["url"]
    by_name = data["user"]["name"]
    integration_tag_name = Integration.GitLab.integration_tag_name(integration)

    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)

    bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id) |> Api.init()

    cmd = %Api.Message.Create{
      roomId: room.id,
      text: "[#{issue_title}](#{issue_url}) #{action} by #{by_name}"
    }

    {:reply, %Fog.Api.Message.Ok{}, _} = Api.request(cmd, bot_agent_sess)

    :ok
  end

  defp post_note_update(workspace, integration, room, data) do
    # action = data["object_attributes"]["action"]
    comment = data["object_attributes"]["note"]
    by_name = data["user"]["name"]
    by_avatar_url = data["user"]["avatar_url"]
    integration_tag_name = Integration.GitLab.integration_tag_name(integration)

    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)

    bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

    cmd = %Api.Message.Create{
      roomId: room.id,
      text: comment,
      fromNameOverride: by_name,
      fromAvatarUrlOverride: by_avatar_url,
      fromApp: "gitlab"
    }

    {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

    :ok
  end

  defp create_internal_issue_room(workspace, integration, issue) do
    internal_hid = Fog.Utils.internal_hid(workspace.id)

    issue_tag = get_issue_tag(integration, issue)

    room =
      Data.Room
      |> Repo.get_by(name: issue["title"], helpdesk_id: internal_hid)
      |> Repo.preload(tags: :tag)

    {:ok, room} =
      if is_nil(room) do
        integration_tag =
          Repo.get_by(Data.Tag,
            name: Integration.GitLab.integration_tag_name(integration),
            workspace_id: workspace.id
          )

        admin_issue_tag =
          Repo.Tag.create(
            workspace.id,
            "#{integration_tag.name}:#{issue["iid"]}:admin"
          )

        try do
          room =
            Repo.Room.create(
              workspace.id,
              helpdesk_id: internal_hid,
              name: issue["title"],
              type: "public",
              tags: [issue_tag.id, admin_issue_tag.id]
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

    room = Repo.Room.update_tags(room.id, [issue_tag.id], [], nil, nil)

    {:ok, room}

    :ok = Api.Event.publish(room)

    {:ok, room}
  end

  defp post_notification(workspace, integration, room, data) do
    action = data["object_attributes"]["action"]
    issue_title = data["object_attributes"]["title"]
    issue_url = data["object_attributes"]["url"]
    issue_number = data["object_attributes"]["iid"]
    by_name = data["user"]["name"]
    by_avatar_url = data["user"]["avatar_url"]
    changes = data["changes"]

    text =
      case action do
        "reopen" ->
          "Reopened [#{issue_title} (##{issue_number})](#{issue_url})"

        "close" ->
          "Closed [#{issue_title} (##{issue_number})](#{issue_url})"

        "update" ->
          ["previous", "current"]
          |> Enum.map(fn field ->
            case changes["assignees"][field] do
              nil ->
                nil

              [] ->
                nil

              users ->
                case field do
                  "previous" -> "Unassigned "
                  "current" -> "Assigned "
                end <>
                  (users
                   |> Enum.map(fn a ->
                     "#{a["name"]} (#{a["username"]})"
                   end)
                   |> Enum.join(", "))
            end
          end)
          |> Enum.filter(&(not is_nil(&1)))
          |> Enum.join("\n\n")

        _ ->
          nil
      end

    case text do
      "" ->
        :ok

      nil ->
        :ok

      _ ->
        integration_tag_name = GitLab.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: text,
          fromNameOverride: by_name,
          fromAvatarUrlOverride: by_avatar_url,
          fromApp: "gitlab"
        }

        {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

        :ok
    end
  end

  defp get_admin_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.GitLab.integration_tag_name(integration)}:#{issue["iid"]}:admin"
    )
  end

  defp get_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.GitLab.integration_tag_name(integration)}:#{issue["iid"]}"
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
