defmodule Fog.Repo.Migrations.AddDeletedVendorAgentRoleTable do
  use Ecto.Migration

  def change do
    create table(:deleted_vendor_agent_role, primary_key: false) do
      add(:vendor_id, :bigint, primary_key: true)
      add(:agent_id, :bigint, primary_key: true)
      add(:role, :text, null: false)
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)

      timestamps()
    end
  end
end
