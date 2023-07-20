defmodule Fog.Integration.TrelloHook do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Integration, Repo, Issue}

  use Task

  alias Fog.Integration.TrelloHook

  defstruct [
    :widget_id,
    :data
  ]

  def consume(%TrelloHook{widget_id: widget_id} = payload)
      when is_binary(widget_id) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(payload) end)

    :ok
  end

  def consume(_) do
    :ok
  end

  def run(%TrelloHook{widget_id: widget_id, data: data}) do
    {:ok, workspace} = Repo.Workspace.from_widget_id(widget_id)

    trello_board_id = data["action"]["data"]["board"]["id"]

    integration = get_integration(workspace, trello_board_id)

    if not is_nil(integration) do
      Data.IntegrationLog.new(
        type: "trello",
        integration_id: integration.id,
        integration_project_id: trello_board_id,
        workspace_id: workspace.id,
        data: data
      )
      |> Repo.insert!()

      Issue.create_from_json(integration, data)

      case data["action"]["type"] do
        type when type in ["addLabelToCard", "updateCard"] ->
          handle_card(workspace, integration, data)

        type when type in ["commentCard"] ->
          handle_comment(workspace, integration, data)

        _ ->
          :ok
      end
    else
      Data.IntegrationLog.new(
        type: "trello",
        workspace_id: workspace.id,
        integration_project_id: trello_board_id,
        data: data
      )
      |> Repo.insert!()
    end
  end

  def run(_) do
    :ok
  end

  defp get_integration(workspace, trello_board_id) do
    from(
      i in Data.WorkspaceIntegration,
      where: i.workspace_id == ^workspace.id,
      where: i.project_id == ^trello_board_id
    )
    |> Repo.one()
  end

  defp handle_card(workspace, integration, data) do
    token = integration.specifics["token"]

    case Fog.Integration.Trello.get_card(token, data["action"]["data"]["card"]["id"]) do
      {:ok, card} ->
        has_fogbender_label =
          (card["labels"] || []) |> Enum.any?(fn %{"name" => name} -> name === "fogbender" end)

        case has_fogbender_label do
          true ->
            {:ok, internal_room} = create_internal_issue_room(workspace, integration, data)

            issue_tag = get_issue_tag(integration, data)
            admin_issue_tag = get_admin_issue_tag(integration, data)
            closed_tag = Repo.Tag.create(integration.workspace_id, ":status:closed")
            open_tag = Repo.Tag.create(integration.workspace_id, ":status:open")

            {:ok, list} =
              Fog.Integration.Trello.get_list(token, data["action"]["data"]["card"]["id"])

            case list["name"] do
              "Done" ->
                :ok = post_notification(workspace, integration, internal_room, data)
                Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])

              _ ->
                :ok = post_notification(workspace, integration, internal_room, data)

                Repo.Workspace.rooms_by_tag_ids(workspace.id, [issue_tag.id, admin_issue_tag.id])
                |> Enum.map(fn r ->
                  Repo.Room.update_tags(
                    r.id,
                    [issue_tag.id, admin_issue_tag.id, open_tag.id],
                    [
                      closed_tag.id
                    ],
                    nil,
                    nil
                  )
                end)
            end
            |> Enum.each(fn r ->
              :ok = Api.Event.publish(r)
            end)

          _ ->
            :ok
        end

      _ ->
        :ok
    end
  end

  defp post_notification(workspace, integration, room, data) do
    text =
      case data["action"]["type"] do
        "updateCard" ->
          list_before = data["action"]["data"]["listBefore"]["name"]
          list_after = data["action"]["data"]["listAfter"]["name"]

          if list_before && list_after do
            "Moved card from **#{list_before}** to **#{list_after}**"
          else
            nil
          end

        _ ->
          nil
      end

    case text do
      nil ->
        :ok

      _ ->
        by_name = data["action"]["memberCreator"]["fullName"]
        by_avatar_url = data["action"]["memberCreator"]["avatarUrl"]
        integration_tag_name = Integration.Trello.integration_tag_name(integration)
        bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)
        bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)

        cmd = %Api.Message.Create{
          roomId: room.id,
          text: text,
          fromNameOverride: by_name,
          fromAvatarUrlOverride: by_avatar_url,
          fromApp: "trello"
        }

        {:reply, _} = Api.Message.info(cmd, bot_agent_sess)

        :ok
    end
  end

  defp handle_comment(workspace, integration, data) do
    internal_hid = Fog.Utils.internal_hid(workspace.id)
    issue_name = data["action"]["data"]["card"]["name"]

    room =
      Data.Room
      |> Repo.get_by(name: issue_name, helpdesk_id: internal_hid)

    if room do
      authorName = data["action"]["memberCreator"]["fullName"]
      by_avatar_url = data["action"]["memberCreator"]["avatarUrl"]

      integration_tag_name = Integration.Trello.integration_tag_name(integration)

      bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag_name)

      bot_agent_sess = Api.Session.for_agent(workspace.vendor_id, bot_agent.id)
      comment = data["action"]["data"]["text"]

      cmd = %Api.Message.Create{
        roomId: room.id,
        text: comment,
        fromNameOverride: authorName,
        fromAvatarUrlOverride: by_avatar_url,
        fromApp: "trello"
      }

      {:reply, _} = Api.Message.info(cmd, bot_agent_sess)
    else
      :ok
    end
  end

  defp create_internal_issue_room(workspace, integration, data) do
    internal_hid = Fog.Utils.internal_hid(workspace.id)

    issue_name = data["action"]["data"]["card"]["name"]

    room =
      Data.Room
      |> Repo.get_by(name: issue_name, helpdesk_id: internal_hid)

    if is_nil(room) do
      integration_tag =
        Repo.get_by(Data.Tag,
          name: Integration.Trello.integration_tag_name(integration),
          workspace_id: workspace.id
        )

      issue_tag = get_issue_tag(integration, data)
      admin_issue_tag = get_admin_issue_tag(integration, data)

      try do
        room =
          Repo.Room.create(
            workspace.id,
            helpdesk_id: internal_hid,
            name: issue_name,
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

  defp get_issue_tag(integration, data) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Trello.integration_tag_name(integration)}:#{data["action"]["data"]["card"]["idShort"]}"
    )
  end

  defp get_admin_issue_tag(integration, data) do
    Repo.Tag.create(
      integration.workspace_id,
      "#{Integration.Trello.integration_tag_name(integration)}:#{data["action"]["data"]["card"]["idShort"]}:admin"
    )
  end
end
