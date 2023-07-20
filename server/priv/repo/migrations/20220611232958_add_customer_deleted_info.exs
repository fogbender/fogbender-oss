defmodule Fog.Repo.Migrations.AddCustomerDeletedInfo do
  use Ecto.Migration

  def change do
    alter table(:customer) do
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)
    end
  end
end
