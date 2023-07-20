defmodule Fog.Integration.AsanaHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}

  use Task

  alias Fog.Integration.AsanaHook

  defstruct [
    :widget_id,
    :signature,
    :data
  ]

  def consume(%AsanaHook{widget_id: widget_id} = payload) when is_binary(widget_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%AsanaHook{widget_id: widget_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    Map.get(data, "events", [])
    |> Enum.each(fn event -> process_event(workspace, event) end)
  end

  def process_event(workspace, event) do
    integration =
      from(
        i in Data.WorkspaceIntegration,
        where: i.workspace_id == ^workspace.id,
        where: i.type == ^"asana"
      )
      |> Repo.one()

    if not is_nil(integration) do
      Data.IntegrationLog.new(
        type: "asana",
        integration_id: integration.id,
        integration_project_id: integration.project_id,
        workspace_id: workspace.id,
        data: event
      )
      |> Repo.insert!()

      # TODO task delete - how to check task tags?
      {task_id, comment_id} =
        case event do
          %{"resource" => %{"resource_type" => "task", "gid" => task_id}} ->
            {task_id, nil}

          %{
            "parent" => %{"resource_type" => "task", "gid" => task_id},
            "resource" => %{"resource_type" => "story", "gid" => comment_id}
          } ->
            {task_id, comment_id}

          _ ->
            {nil, nil}
        end

      api_key = integration.specifics["api_key"]

      case Integration.Asana.get_task(api_key, task_id) do
        {:ok, task} ->
          Data.IntegrationLog.new(
            type: "asana",
            integration_id: integration.id,
            integration_project_id: integration.project_id,
            workspace_id: workspace.id,
            data: task
          )
          |> Repo.insert!()

          Issue.create_from_json(integration, task)

          tags = task["tags"]
          has_tag = tags |> Enum.any?(&(&1["gid"] == integration.specifics["fogbender_tag_id"]))

          task_tag = get_task_tag(integration, task)
          admin_task_tag = get_admin_task_tag(integration, task)
          open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")
          closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")

          case has_tag and event_type(event) do
            :task_add ->
              task_add(workspace, integration, task)

            :task_close ->
              Repo.Workspace.rooms_by_tag_ids(workspace.id, [task_tag.id, admin_task_tag.id])
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

            :task_reopened ->
              Repo.Workspace.rooms_by_tag_ids(workspace.id, [task_tag.id, admin_task_tag.id])
              |> Enum.map(fn r ->
                Repo.Room.update_tags(r.id, [open_tag.id, task_tag.id], [closed_tag], nil, nil)
              end)
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

            :task_edit_notes ->
              task_edit_notes(workspace, integration, task)

            :comment_add ->
              {:ok, room} = create_internal_task_room(workspace, integration, task)
              comment_add(workspace, integration, room, comment_id, api_key, event)

            :comment_delete ->
              comment_delete(workspace, integration, comment_id)

            _ ->
              :ok
          end

        _ ->
          :ok
      end
    else
      Data.IntegrationLog.new(type: "asana", workspace_id: workspace.id, data: event)
      |> Repo.insert!()
    end
  end

  #  "action" => "added",
  #  "created_at" => "2022-04-01T12:35:54.536Z",
  #  "parent" => %{"gid" => "1201846083664473", "resource_type" => "project"},
  #  "resource" => %{
  #    "gid" => "1202062567886360",
  #    "resource_subtype" => "default_task",
  #    "resource_type" => "task"
  #  }
  defp event_type(%{"action" => "added", "parent" => %{"resource_type" => "project"}}) do
    :task_add
  end

  #  "action" => "changed",
  #  "change" => %{"action" => "changed", "field" => "notes"},
  #  "created_at" => "2022-04-01T12:42:39.801Z",
  #  "parent" => nil,
  #  "resource" => %{
  #    "gid" => "1202062567886360",
  #    "resource_subtype" => "default_task",
  #    "resource_type" => "task"
  #  }
  defp event_type(%{
         "action" => "changed",
         "change" => %{"action" => "changed", "field" => "notes"}
       }) do
    :task_edit_notes
  end

  #  "action" => "added",
  #  "created_at" => "2022-04-01T12:44:49.801Z",
  #  "parent" => %{
  #    "gid" => "1202062567886360",
  #    "resource_subtype" => "default_task",
  #    "resource_type" => "task"
  #  },
  #  "resource" => %{
  #    "gid" => "1202062342928850",
  #    "resource_subtype" => "comment_added",
  #    "resource_type" => "story"
  #  }
  defp event_type(%{
         "action" => "added",
         "resource" => %{"resource_type" => "story", "resource_subtype" => "marked_complete"}
       }) do
    :task_close
  end

  defp event_type(%{
         "action" => "added",
         "resource" => %{"resource_type" => "story", "resource_subtype" => "marked_incomplete"}
       }) do
    :task_reopened
  end

  defp event_type(%{"action" => "added", "resource" => %{"resource_type" => "story"}}) do
    :comment_add
  end

  # TODO edit comment - no events from asana

  #  "action" => "removed",
  #  "created_at" => "2022-04-01T12:52:28.027Z",
  #  "parent" => %{
  #    "gid" => "1202062567886360",
  #    "resource_subtype" => "default_task",
  #    "resource_type" => "task"
  #  },
  #  "resource" => %{
  #    "gid" => "1202062342928850",
  #    "resource_subtype" => "comment_added",
  #    "resource_type" => "story"
  #  }
  defp event_type(%{"action" => "removed", "resource" => %{"resource_type" => "story"}}) do
    :comment_delete
  end

  defp event_type(_event) do
    nil
  end

  defp task_add(workspace, integration, task) do
    {:ok, _room} = create_internal_task_room(workspace, integration, task)
    task_tag = get_task_tag(integration, task)
    admin_task_tag = get_admin_task_tag(integration, task)
    open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")

    Repo.Workspace.rooms_by_tag_ids(workspace.id, [task_tag.id, admin_task_tag.id])
    |> Enum.map(fn r ->
      Repo.Room.update_tags(r.id, [open_tag.id, task_tag.id], [], nil, nil)
    end)
    |> Enum.each(fn r ->
      :ok = Api.Event.publish(r)
    end)
  end

  defp task_edit_notes(_workspace, _integration, _task) do
    # TODO
  end

  defp comment_add(workspace, integration, room, comment_id, api_key, event) do
    {:ok, asana_comment} = Integration.Asana.get_comment(api_key, comment_id)
    {:ok, asana_user} = Integration.Asana.get_user(api_key, event["user"]["gid"])

    if asana_comment["text"] do
      integration_tag_name = Integration.Asana.integration_tag_name(integration)
      bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
      bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

      cmd = %Api.Message.Create{
        roomId: room.id,
        text: asana_comment["text"],
        fromNameOverride: asana_user["name"],
        fromAvatarUrlOverride: asana_user["photo"]["image_21x21"],
        fromApp: "asana"
      }

      {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

      :ok
    end
  end

  defp comment_delete(_workspace, _integration, _comment_id) do
    # TODO
  end

  defp create_internal_task_room(workspace, integration, task) do
    internal_hid = Fog.Utils.internal_hid(workspace.id)

    room =
      Data.Room
      |> Repo.get_by(name: task["name"], helpdesk_id: internal_hid)

    if is_nil(room) do
      integration_tag =
        Repo.get_by(Data.Tag,
          name: Integration.Asana.integration_tag_name(integration),
          workspace_id: workspace.id
        )

      task_tag = get_task_tag(integration, task)
      admin_task_tag = get_admin_task_tag(integration, task)

      try do
        room =
          Repo.Room.create(
            workspace.id,
            helpdesk_id: internal_hid,
            name: task["name"],
            type: "public",
            tags: [integration_tag.id, task_tag.id, admin_task_tag.id]
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

  defp get_task_tag(integration, task) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Asana.integration_tag_name(integration)}:#{task["gid"]}"
    )
  end

  defp get_admin_task_tag(integration, task) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Asana.integration_tag_name(integration)}:#{task["gid"]}:admin"
    )
  end
end
