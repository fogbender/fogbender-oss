defmodule Fog.Repo.Migrations.AddDeletedInfoToUser do
  use Ecto.Migration

  def change do
    alter table(:user) do
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)
    end
  end
end
