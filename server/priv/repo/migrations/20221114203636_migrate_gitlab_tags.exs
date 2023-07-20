defmodule Fog.Repo.Migrations.MigrateGitlabTags do
  use Ecto.Migration

  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Data, Repo}

  def change do
    flush()
  end

  def up do
    from(
      wi in Data.WorkspaceIntegration,
      where: wi.type == "gitlab",
      preload: [workspace: :vendor]
    )
    |> Repo.all()
    |> Enum.map(fn %Data.WorkspaceIntegration{
                     workspace_id: workspace_id,
                     specifics: specifics
                   } = _integration ->
      case specifics do
        %{"project_id" => project_id, "project_id_numeric" => project_id_numeric} ->
          old_integration_tag_prefix = ":gitlab:#{project_id}"
          new_integration_tag_prefix = ":gitlab:#{project_id_numeric}"

          agents =
            from(
              a in Data.Agent,
              left_join: at in assoc(a, :tags),
              left_join: t in assoc(at, :tag),
              on: at.tag_id == t.id and at.agent_id == a.id,
              where: t.name == ^old_integration_tag_prefix,
              where: t.name != ^new_integration_tag_prefix,
              preload: [tags: :tag]
            )
            |> Repo.all()

          {new_integration_tag_prefix, workspace_id, agents}

        _ ->
          {nil, nil, []}
      end
    end)
    |> Enum.filter(fn
      {nil, _, _} -> false
      _ -> true
    end)
    |> Enum.each(fn {tag_name, workspace_id, agents} ->
      tag = Repo.Tag.create(workspace_id, tag_name)

      agents
      |> Enum.each(fn agent ->
        Data.AuthorTag.new(agent_id: agent.id, tag_id: tag.id)
        |> Repo.insert!(
          on_conflict: :nothing,
          conflict_target: [:agent_id, :tag_id]
        )
      end)
    end)

    from(
      wi in Data.WorkspaceIntegration,
      where: wi.type == "gitlab",
      preload: [workspace: :vendor]
    )
    |> Repo.all()
    |> Enum.each(fn %Data.WorkspaceIntegration{
                      workspace_id: workspace_id,
                      specifics: specifics
                    } = integration ->
      case specifics do
        %{"project_id" => project_id, "project_id_numeric" => project_id_numeric} ->
          old_integration_tag_prefix = ":gitlab:#{project_id}"
          new_integration_tag_prefix = ":gitlab:#{project_id_numeric}"

          Data.WorkspaceIntegration.update(integration,
            specifics: specifics,
            project_id: project_id_numeric
          )
          |> Repo.update!()

          from(
            rt in Data.RoomTag,
            join: t in assoc(rt, :tag),
            where: like(t.name, ":gitlab:%"),
            where: t.workspace_id == ^workspace_id,
            preload: :tag
          )
          |> Repo.all()
          |> Enum.each(fn %Data.RoomTag{tag: tag, room_id: room_id} ->
            case tag.name |> String.starts_with?(new_integration_tag_prefix) do
              true ->
                :ok

              false ->
                case tag.name |> String.starts_with?(old_integration_tag_prefix) do
                  true ->
                    new_name =
                      tag.name
                      |> String.replace(old_integration_tag_prefix, new_integration_tag_prefix)

                    new_tag = Repo.Tag.create(workspace_id, new_name)

                    Data.RoomTag.new(tag_id: new_tag.id, room_id: room_id)
                    |> Repo.insert!(
                      on_conflict: :nothing,
                      conflict_target: [:tag_id, :room_id]
                    )

                  false ->
                    :ok
                end
            end
          end)

          from(
            ii in Data.IntegrationIssue,
            where: ii.workspace_id == ^workspace_id,
            where: ii.project_id == ^project_id
          )
          |> Repo.all()
          |> Enum.each(fn ii ->
            Data.IntegrationIssue.new(
              workspace_id: workspace_id,
              type: ii.type,
              project_id: project_id_numeric,
              issue_id: ii.issue_id,
              issue_number: ii.issue_number,
              name: ii.name,
              url: ii.url
            )
            |> Repo.insert()
          end)

        _ ->
          :ok
      end
    end)
  end
end
