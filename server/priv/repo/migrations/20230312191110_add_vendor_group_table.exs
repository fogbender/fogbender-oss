defmodule Fog.Repo.Migrations.AddVendorGroupTable do
  use Ecto.Migration

  import Ecto.Query

  def change do
    create table(:vendor_group, primary_key: false) do
      add(:vendor_id, :bigint, null: false, primary_key: true)
      add(:group, :text, null: false, primary_key: true)

      timestamps()
    end

    create(unique_index(:vendor_group, [:vendor_id, :group], name: :vendor_group_uq_index))

    flush()

    try do
      fields = [:id]

      from(v in Fog.Data.Vendor,
        select: ^fields
      )
      |> Fog.Repo.all()
      |> Enum.each(fn v ->
        {:ok, _} =
          Fog.Data.VendorGroup.new(vendor_id: v.id, group: "all")
          |> Fog.Repo.insert()
      end)
    rescue
      e ->
        IO.inspect(e)
        :ok
    end
  end
end
