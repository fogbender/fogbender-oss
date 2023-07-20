defmodule Fog.Repo.Migrations.MigrateIntegrationTags do
  use Ecto.Migration

  import Ecto.Query, only: [from: 1]

  def change do
    flush()
  end

  try do
    migrate_tag = fn workspace, old, new, compare_f ->
      workspace.rooms
      |> Enum.each(fn r ->
        r = r |> Fog.Repo.preload(tags: :tag)

        r.tags
        |> Enum.each(fn rt ->
          case compare_f.(rt.tag.name, old, new) do
            true ->
              new_tag_name = String.replace_leading(rt.tag.name, old, new)

              try do
                new_tag = Fog.Repo.Tag.create(workspace.id, new_tag_name)
                %Fog.Data.Room{} = Fog.Repo.Room.update_tags(r.id, [new_tag.id], [])
              rescue
                _e in [Ecto.ConstraintError] ->
                  new_tag =
                    Fog.Repo.get_by(Fog.Data.Tag, name: new_tag_name, workspace_id: workspace.id)

                  try do
                    %Fog.Data.Room{} = Fog.Repo.Room.update_tags(r.id, [new_tag.id], [])
                  rescue
                    _e in [Ecto.ConstraintError] ->
                      :ok
                  end
              end

            false ->
              :ok
          end
        end)
      end)
    end

    from(v in Fog.Data.Vendor)
    |> Fog.Repo.all()
    |> Fog.Repo.preload(workspaces: :integrations, workspaces: :rooms)
    |> Enum.each(fn v ->
      v.workspaces
      |> Enum.each(fn w ->
        w.integrations
        |> Enum.each(fn i ->
          old_tag_prefix = ":#{i.type}:#{i.id}:"
          new_tag_prefix = ":#{i.type}:#{i.project_id}:"

          migrate_tag.(w, old_tag_prefix, new_tag_prefix, fn name, old, _new ->
            String.starts_with?(name, old)
          end)

          old_tag_name = ":#{i.type}:#{i.id}"
          new_tag_name = ":#{i.type}:#{i.project_id}"

          migrate_tag.(w, old_tag_name, new_tag_name, fn name, old, _new ->
            name === old
          end)
        end)
      end)
    end)
  rescue
    _e ->
      :ok
  end
end
