defmodule Fog.Repo.Migrations.CreateUserEventTable do
  use Ecto.Migration

  def change do
    create table(:user_event, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:user_id, :bigint, null: false)
      add(:event, :text, null: false)
      add(:meta, :text, null: true)

      timestamps()
    end

    create(index(:user_event, [:event, :inserted_at]))
  end
end
