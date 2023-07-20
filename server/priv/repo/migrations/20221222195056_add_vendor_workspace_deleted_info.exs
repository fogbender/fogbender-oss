defmodule Fog.Repo.Migrations.AddVendorWorkspaceDeletedInfo do
  use Ecto.Migration

  def change do
    alter table(:vendor) do
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)
    end

    alter table(:workspace) do
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)
    end
  end
end
