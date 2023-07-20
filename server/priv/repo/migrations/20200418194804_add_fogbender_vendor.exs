defmodule Fog.Repo.Migrations.AddFogbenderVendor do
  use Ecto.Migration

  # h Ecto.Migration.execute
  def change do
    vendor_id = Fog.env(:fogbender_vendor_id)
    vendor_name = Fog.env(:fogbender_vendor_name)

    workspace_id = Fog.env(:fogbender_workspace_id)
    workspace_name = Fog.env(:fogbender_workspace_name)

    "v" <> vendor_id = vendor_id
    vendor_id = String.to_integer(vendor_id)
    "w" <> workspace_id = workspace_id
    workspace_id = String.to_integer(workspace_id)

    execute(
      query!(
        "insert into vendor (id, name, inserted_at,updated_at) values ($1, $2, now(), now());",
        [vendor_id, vendor_name]
      ),
      query!("delete from vendor where id=$1;", [vendor_id])
    )

    execute(
      query!(
        "insert into workspace (id, name, vendor_id, inserted_at,updated_at) values ($1, $2, $3, now(), now());",
        [workspace_id, workspace_name, vendor_id]
      ),
      query!("delete from workspace where id=$1;", [workspace_id])
    )
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
