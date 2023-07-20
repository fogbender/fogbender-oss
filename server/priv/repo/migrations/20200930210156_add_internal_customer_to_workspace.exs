defmodule Fog.Repo.Migrations.AddInternalCustomerToWorkspace do
  use Ecto.Migration

  def change do
    execute(
      query!(
        """
        with ins1 as (
          insert into customer(id, vendor_id, name, inserted_at, updated_at)
          select snowflake_id(1), v.id, concat('$Cust_Internal_', snowflake_id(1)), now(), now()
          from vendor v
          returning id as customer_id, vendor_id as vendor_id0
        )
        insert into helpdesk(id, customer_id, workspace_id, inserted_at, updated_at)
        select snowflake_id(1), customer_id, w.id, now(), now()
        from ins1 join workspace w on w.vendor_id = vendor_id0
        """,
        []
      )
    )
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
