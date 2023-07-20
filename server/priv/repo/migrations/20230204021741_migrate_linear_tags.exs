defmodule Fog.Repo.Migrations.MigrateLinearTags do
  use Ecto.Migration

  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Data, Repo}

  def change do
    flush()
  end

  def up0 do
    integration_issue_ids_to_delete =
      from(
        ii in Data.IntegrationIssue,
        where: ii.type == "linear",
        preload: :workspace
      )
      |> Repo.all()
      |> Enum.map(fn %Data.IntegrationIssue{issue_id: issue_id, issue_number: issue_number} = ii ->
        old_tag_name = ":linear:#{ii.project_id}:#{ii.issue_id}"
        new_tag_name = ":linear:#{ii.project_id}:#{ii.issue_number}"
        new_tag = Repo.Tag.create(ii.workspace.id, new_tag_name)

        from(
          rt in Data.RoomTag,
          join: t in assoc(rt, :tag),
          on: t.name == ^old_tag_name
        )
        |> Repo.all()
        |> Enum.map(fn %Data.RoomTag{room_id: room_id} ->
          Data.RoomTag.new(tag_id: new_tag.id, room_id: room_id)
          |> Repo.insert!(
            on_conflict: :nothing,
            conflict_target: [:tag_id, :room_id]
          )

          params = %{
            workspace_id: ii.workspace.id,
            type: ii.type,
            project_id: ii.project_id,
            issue_id: ii.issue_number,
            issue_number: ii.issue_id,
            url: ii.url,
            name: ii.name
          }

          %Data.IntegrationIssue{} = Repo.IntegrationIssue.insert_or_update(params)
          ii.id
        end)
      end)
      |> List.flatten()

    from(
      ii in Data.IntegrationIssue,
      where: ii.id in ^integration_issue_ids_to_delete
    )
    |> Repo.delete_all()
  end
end
