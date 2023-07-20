defmodule Fog.Repo.Migrations.AddVendorAgentGroupTable do
  use Ecto.Migration

  import Ecto.Query

  def change do
    create table(:vendor_agent_group, primary_key: false) do
      add(:vendor_id, :bigint, null: false, primary_key: true)
      add(:agent_id, :bigint, null: false, primary_key: true)
      add(:group, :text, null: false, primary_key: true)

      timestamps()
    end

    create(
      unique_index(:vendor_agent_group, [:vendor_id, :agent_id, :group],
        name: :vendor_agent_group_uq_index
      )
    )

    alter table(:room) do
      add(:agent_groups, {:array, :string})
    end

    flush()

    try do
      fields = [:id, :name, :inserted_at]

      from(v in Fog.Data.Vendor,
        select: ^fields
      )
      |> Fog.Repo.all()
      |> Fog.Repo.preload(:agents)
      |> Enum.each(fn v ->
        v.agents
        |> Enum.each(fn a ->
          {:ok, _} =
            Fog.Data.VendorAgentGroup.new(vendor_id: v.id, agent_id: a.agent_id, group: "all")
            |> Fog.Repo.insert()
        end)
      end)
    rescue
      e ->
        IO.inspect(e)
        :ok
    end
  end
end
