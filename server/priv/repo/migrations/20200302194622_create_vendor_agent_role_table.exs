defmodule Fog.Repo.Migrations.CreateVendorAgentRoleTable do
  use Ecto.Migration

  def change do
    create table(:vendor_agent_role, primary_key: false) do
      add(:vendor_id, :bigint, primary_key: true)
      add(:agent_id, :bigint, primary_key: true)
      add(:role, :text, null: false)

      timestamps()
    end
  end
end
