defmodule Fog.Repo.Migrations.AddCustomerExternalUidUniqIndex do
  use Ecto.Migration

  def change do
    execute(
      query!(
        """
        update customer c1
        set external_uid = external_uid || ' FIX ' || id
        where exists(select 1
                     from customer c2
                     where c2.vendor_id = c1.vendor_id
                       and c2.external_uid = c1.external_uid
                       and c2.id < c1.id)
        """,
        []
      ),
      ""
    )

    create(unique_index(:customer, [:vendor_id, :external_uid]))
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
