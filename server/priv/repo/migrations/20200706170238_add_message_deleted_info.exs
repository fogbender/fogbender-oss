defmodule Fog.Repo.Migrations.AddMessageDeletedInfo do
  use Ecto.Migration

  def change do
    alter table(:message) do
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)
      add(:deleted_by_user_id, :bigint, null: true)
    end
  end
end
