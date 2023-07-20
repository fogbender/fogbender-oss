defmodule Fog.Repo.Migrations.AddMessageEditedInfo do
  use Ecto.Migration

  def change do
    alter table(:message) do
      add(:edited_at, :utc_datetime_usec, null: true)
      add(:edited_by_agent_id, :bigint, null: true)
      add(:edited_by_user_id, :bigint, null: true)
    end
  end
end
