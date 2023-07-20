defmodule Fog.Integration.HeightHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}

  use Task

  alias Fog.Integration.HeightHook

  defstruct [
    :widget_id,
    :height_workspace_id,
    :data
  ]

  def consume(
        %HeightHook{widget_id: widget_id, height_workspace_id: height_workspace_id} = payload
      )
      when is_binary(widget_id) and is_binary(height_workspace_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%HeightHook{widget_id: widget_id, height_workspace_id: height_workspace_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    integration = get_integration(workspace, height_workspace_id)

    if not is_nil(integration) do
      Data.IntegrationLog.new(
        type: "height",
        integration_id: integration.id,
        integration_project_id: height_workspace_id,
        workspace_id: workspace.id,
        data: data
      )
      |> Repo.insert!()

      Issue.create_from_json(integration, data)

      case data["type"] do
        "activity.created" ->
          case data["data"]["model"]["type"] do
            "comment" ->
              handle_comment(workspace, integration, data)

            "listsChange" ->
              fogbender_list_id = integration.specifics["fogbender_list_id"]
              task_lists = data["data"]["model"]["newValue"] |> String.split(",")

              if fogbender_list_id in task_lists do
                {:ok, _room} = create_internal_issue_room(workspace, integration, data["data"])

                :ok = update_status(integration, data["data"]["model"]["task"])
              end

            "statusChange" ->
              {:ok, internal_room} =
                create_internal_issue_room(workspace, integration, data["data"])

              :ok = update_status(integration, data["data"]["model"]["task"])

              :ok =
                post_status_change_notification(
                  workspace,
                  integration,
                  internal_room,
                  data["data"]["model"]
                )

            _ ->
              :ok
          end

        _ ->
          :ok
      end
    else
      Data.IntegrationLog.new(
        type: "height",
        workspace_id: workspace.id,
        data: data,
        integration_project_id: height_workspace_id
      )
      |> Repo.insert!()
    end
  end

  def run(_) do
    :ok
  end

  defp get_integration(workspace, height_workspace_id) do
    from(
      i in Data.WorkspaceIntegration,
      where: i.workspace_id == ^workspace.id,
      where: i.project_id == ^height_workspace_id
    )
    |> Repo.one()
  end

  def handle_comment(workspace, integration, data) do
    admin_issue_tag = get_admin_issue_tag(integration, data["data"]["model"]["task"])
    user_token = integration.specifics["user_token"]

    case Repo.Workspace.rooms_by_tag_ids(workspace.id, [admin_issue_tag.id]) do
      [room] ->
        case data["data"]["model"]["type"] do
          "comment" ->
            user = Fog.Integration.Height.user(user_token, data["data"]["model"]["createdUserId"])

            case user do
              nil ->
                :ok

              {:ok, %{"firstname" => f_name, "lastname" => l_name} = user} ->
                integration_tag_name = Integration.Height.integration_tag_name(integration)
                bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
                bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)
                by_name = "#{f_name} #{l_name}"
                by_avatar_url = user["pictureUrl"]
                comment = data["data"]["model"]["message"]

                cmd = %Api.Message.Create{
                  roomId: room.id,
                  text: "#{comment}",
                  fromNameOverride: by_name,
                  fromAvatarUrlOverride: by_avatar_url
                }

                {:reply, _} = Api.Message.info(cmd, bot_agent_sess)
            end

          _ ->
            :ok
        end

      _ ->
        :ok
    end
  end

  defp create_internal_issue_room(workspace, integration, issue) do
    internal_hid = Fog.Utils.internal_hid(workspace.id)

    room_name = issue["model"]["task"]["name"]

    room =
      Data.Room
      |> Repo.get_by(name: room_name, helpdesk_id: internal_hid)

    issue_tag = get_issue_tag(integration, issue["model"]["task"])
    admin_issue_tag = get_admin_issue_tag(integration, issue["model"]["task"])

    {:ok, room} =
      if is_nil(room) do
        try do
          room =
            Repo.Room.create(
              workspace.id,
              helpdesk_id: internal_hid,
              name: room_name,
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
                  room = Data.Room |> Repo.get_by(name: room_name, helpdesk_id: internal_hid)

                {:ok, room}

              e ->
                Logger.error("Error: #{inspect(e)}")
                {:error, e}
            end
        end
      else
        {:ok, room}
      end

    room = Repo.Room.update_tags(room.id, [issue_tag.id, admin_issue_tag.id], [], nil, nil)

    :ok = Api.Event.publish(room)

    {:ok, room}
  end

  defp update_status(integration, task) do
    issue_tag = get_issue_tag(integration, task)
    closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")
    open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")

    case Repo.Workspace.rooms_by_tag_ids(integration.workspace_id, [issue_tag.id]) do
      [] ->
        :ok

      rooms ->
        if task["status"] in ["inProgress", "backLog"] do
          rooms
          |> Enum.map(fn r ->
            Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)
          end)
        end

        rooms
        |> Enum.each(fn r ->
          :ok = Api.Event.publish(r)
        end)
    end

    :ok
  end

  defp post_status_change_notification(workspace, integration, room, model) do
    user_token = integration.specifics["user_token"]

    case Fog.Integration.Height.user(user_token, model["createdUserId"]) do
      nil ->
        :ok

      {:ok, %{"firstname" => f_name, "lastname" => l_name} = user} ->
        integration_tag_name = Integration.Height.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)
        by_name = "#{f_name} #{l_name}"
        by_avatar_url = user["pictureUrl"]

        text = "Changed status from **#{model["oldValue"]}** to **#{model["newValue"]}**"

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: text,
          fromNameOverride: by_name,
          fromAvatarUrlOverride: by_avatar_url
        }

        {:reply, _} = Api.Message.info(cmd, bot_agent_sess)
    end

    :ok
  end

  defp get_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Height.integration_tag_name(integration)}:#{issue["index"]}"
    )
  end

  defp get_admin_issue_tag(integration, issue) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Height.integration_tag_name(integration)}:#{issue["index"]}:admin"
    )
  end
end
