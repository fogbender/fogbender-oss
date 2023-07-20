defmodule Fog.Repo.Migrations.AddTriageRoomsToHelpdesks do
  use Ecto.Migration

  def change do
    execute(
      query!(
        """
        insert into room(id, helpdesk_id, name, inserted_at, updated_at)
        select snowflake_id(1), h.id, $1, now(), now()
        from helpdesk h
        where not exists(select 1 from room r where r.helpdesk_id = h.id and r.name = $1)
        """,
        ["Triage"]
      ),
      ""
    )
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
