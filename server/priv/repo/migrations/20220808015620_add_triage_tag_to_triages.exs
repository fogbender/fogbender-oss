defmodule Fog.Repo.Migrations.AddTriageTagToTriages do
  use Ecto.Migration

  import Ecto.Query, only: [from: 1]

  def change do
    flush()
  end

  try do
    add_triage_tag = fn workspace ->
      triage_tag = Fog.Repo.Tag.create(workspace.id, ":triage")

      workspace.rooms
      |> Enum.filter(&(&1.is_triage === true))
      |> Enum.each(fn r ->
        r = r |> Fog.Repo.preload(tags: :tag)

        tags =
          r.tags
          |> Enum.map(&%{room_id: &1.room_id, tag_id: &1.tag_id})
          |> Enum.filter(&(&1.tag_id !== triage_tag.id))

        %Fog.Data.Room{} = Fog.Repo.Room.update_tags(r.id, [triage_tag.id], [])
      end)
    end

    from(v in Fog.Data.Vendor)
    |> Fog.Repo.all()
    |> Fog.Repo.preload(workspaces: :rooms)
    |> Enum.each(fn v ->
      v.workspaces
      |> Enum.each(fn w ->
        w |> add_triage_tag.()
      end)
    end)
  rescue
    err ->
      IO.puts(Exception.format(:error, err, __STACKTRACE__))
      :ok
  end
end
