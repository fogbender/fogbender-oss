defmodule Fog.Repo.Migrations.AddVendorAgentInviteId do
  use Ecto.Migration

  def change do
    alter table(:vendor_agent_invite) do
      add(:invite_id, :bigint, null: false)
    end

    create(
      unique_index(:vendor_agent_invite, [:invite_id], name: "vendor_agent_invite_id_uniq_index")
    )
  end
end
