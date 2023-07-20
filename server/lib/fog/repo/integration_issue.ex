defmodule Fog.Repo.IntegrationIssue do
  require Logger

  import Ecto.Query

  alias Fog.{Data, Repo}

  def insert_or_update(params) do
    Data.IntegrationIssue.new(params)
    |> Repo.insert!(
      on_conflict: {:replace, [:issue_number, :url, :name, :state]},
      conflict_target: [:workspace_id, :type, :project_id, :issue_id],
      returning: true
    )
  end

  def backfill_state() do
    from(
      ii in Data.IntegrationIssue,
      where: is_nil(ii.state)
    )
    |> Repo.all()
    |> Enum.each(fn ii ->
      i =
        Repo.get_by(Data.WorkspaceIntegration,
          workspace_id: ii.workspace_id,
          type: ii.type,
          project_id: ii.project_id
        )

      if i do
        cmd = %Fog.Api.Integration.IssueInfo{
          issueId: ii.issue_id
        }

        info =
          try do
            {:ok, info} = Fog.Integration.handle(i, cmd)
            info
          rescue
            e ->
              Logger.info("issue_info for #{inspect(ii)} returned #{inspect(e)}")
              nil
          end

        if info do
          params = %{
            workspace_id: ii.workspace_id,
            type: ii.type,
            project_id: ii.project_id,
            issue_id: ii.issue_id,
            issue_number: ii.issue_number,
            url: ii.url,
            name: ii.name,
            state: Fog.Issue.normalize_state(info.state)
          }

          x = insert_or_update(params)

          Logger.info(x)
        end

        Process.sleep(500)
      end
    end)
  end

  def backfill_status_tags() do
    from(
      ii in Data.IntegrationIssue,
      where: not is_nil(ii.state)
    )
    |> Repo.all()
    |> Enum.each(fn ii ->
      Repo.get_by(Data.WorkspaceIntegration,
        workspace_id: ii.workspace_id,
        type: ii.type,
        project_id: ii.project_id
      )

      issue_tag = Repo.Tag.create(ii.workspace_id, Fog.Issue.meta_tag(ii))
      closed_tag = Repo.Tag.create(ii.workspace_id, ":status:closed")
      open_tag = Repo.Tag.create(ii.workspace_id, ":status:open")

      Repo.Workspace.rooms_by_tag_ids(ii.workspace_id, [issue_tag.id])
      |> Enum.each(fn r ->
        case ii.state do
          "open" ->
            %Data.Room{} = Repo.Room.update_tags(r.id, [open_tag.id], [closed_tag.id], nil, nil)

          "closed" ->
            %Data.Room{} = Repo.Room.update_tags(r.id, [closed_tag.id], [open_tag.id], nil, nil)
        end
      end)
    end)
  end
end
