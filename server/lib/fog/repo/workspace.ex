defmodule Fog.Repo.Workspace do
  import Ecto.Query, only: [from: 2]

  alias Fog.{Integration, Data, Repo}

  import Fog.Repo, only: [sql_split_part: 3]

  def get(wid), do: Data.Workspace |> Fog.Repo.get(wid)

  def get_by_helpdesk(hid) do
    from(w in Data.Workspace,
      join: h in assoc(w, :helpdesks),
      where: h.id == ^hid
    )
    |> Repo.one()
  end

  def get_tags(wid) do
    from(
      t in Data.Tag,
      left_join: integration in Data.WorkspaceIntegration,
      on:
        integration.workspace_id == t.workspace_id and
          sql_split_part(t.name, ":", 2) in ^Integration.providers() and
          sql_split_part(t.name, ":", 2) == integration.type and
          sql_split_part(t.name, ":", 3) == integration.project_id,
      left_join: issue in Data.IntegrationIssue,
      on:
        issue.workspace_id == integration.workspace_id and
          issue.type == integration.type and
          issue.project_id == integration.project_id and
          sql_split_part(t.name, ":", 4) != "" and
          issue.issue_id == sql_split_part(t.name, ":", 4),
      where: t.workspace_id == ^wid,
      select: t,
      select_merge: %{
        integration: integration,
        integration_issue: issue
      }
    )
    |> Repo.all()
  end

  def get_tags(wid, ids) do
    from(
      t in Data.Tag,
      where: t.workspace_id == ^wid,
      where: t.id in ^ids,
      select: t
    )
    |> Fog.Repo.all()
  end

  def rooms_by_tag_ids(wid, tag_ids) do
    from(
      r0 in Data.Room,
      join: w in assoc(r0, :workspace),
      on: w.id == ^wid,
      join: r in assoc(w, :rooms),
      on: r0.id == r.id,
      join: t in assoc(r, :tags),
      where: t.tag_id in ^tag_ids,
      preload: [tags: :tag]
    )
    |> Fog.Repo.all()
  end

  def get_integrations(wid) do
    from(
      i in Data.WorkspaceIntegration,
      where: i.workspace_id == ^wid
    )
    |> Fog.Repo.all()
  end

  def agent_role(wid, aid) do
    from(av in Data.VendorAgentRole,
      join: v in assoc(av, :vendor),
      join: w in assoc(v, :workspaces),
      where: w.id == ^wid and av.agent_id == ^aid,
      select: av.role
    )
    |> Fog.Repo.one()
  end

  def flags(wid) do
    from(wf in Data.WorkspaceFeatureFlag,
      where: wf.workspace_id == ^wid,
      select: wf.feature_flag_id
    )
    |> Fog.Repo.all()
  end

  def from_widget_id(widget_id) do
    case Base.url_decode64(widget_id, padding: false) do
      {:ok, workspace_id} ->
        case Fog.Repo.Workspace.get(workspace_id) do
          %Data.Workspace{} = workspace ->
            {:ok, workspace}

          nil ->
            {:error, {:unknown_workspace, workspace_id}}
        end

      :error ->
        {:error, :widget_id_invalid}
    end
  end

  def to_widget_id(%Data.Workspace{id: workspace_id}) do
    {:ok, Base.url_encode64(workspace_id, padding: false)}
  end

  def to_widget_id(workspace_id) when is_binary(workspace_id) do
    case Data.Workspace |> Fog.Repo.get(workspace_id) do
      nil ->
        {:error, {:unknown_workspace, workspace_id}}

      workspace ->
        to_widget_id(workspace)
    end
  end

  def forward_email_address(workspace_id) do
    {:ok, widget_id} = to_widget_id(workspace_id)
    "#{Base.encode16(widget_id, case: :lower)}@#{Fog.env(:inbox_domain)}"
  end

  def resolve_rooms(workspace_id, agent_id) do
    h_internal = Repo.Helpdesk.get_internal(workspace_id)

    from(r in Data.Room,
      join: h in assoc(r, :helpdesk),
      where:
        h.id != ^h_internal.id and
          h.workspace_id == ^workspace_id and
          not r.resolved
    )
    |> Repo.update_all(
      set: [
        resolved: true,
        resolved_at: DateTime.utc_now(),
        resolved_by_agent_id: agent_id,
        updated_at: DateTime.utc_now()
      ]
    )
  end

  def delete_integration(integration, workspace) do
    Repo.get_by(Data.WorkspaceIntegration, id: integration.id)
    |> Repo.delete!()

    integration_tag =
      Data.Tag
      |> Repo.get_by(
        name: ":#{integration.type}:#{integration.project_id}",
        workspace_id: integration.workspace_id
      )

    inactive_tag = Repo.Tag.create(workspace.id, ":app:inactive")
    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag.name)

    Fog.Utils.add_tags_to_author(bot_agent, [inactive_tag.id])

    :ok
  end
end
