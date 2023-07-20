defmodule Fog.Repo.Migrations.CreateFogviteTable do
  use Ecto.Migration

  def change do
    create table(:fogvite, primary_key: false) do
      add(:id, :bigint, primary_key: true)

      add(:invite_sent_to_email, :string)
      add(:sender_agent_id, :bigint, null: false)
      add(:accepted_by_agent_id, :bigint)
      add(:fogvite_code, :string, default: nil)

      add(:deleted_at, :utc_datetime_usec, null: true)
      timestamps()
    end
  end
end
