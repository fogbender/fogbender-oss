defmodule Fog.Repo.Migrations.AddUserLastActivityAtColumn do
  use Ecto.Migration

  def change do
    alter table(:user) do
      add(:last_activity_at, :timestamp, null: true)
    end
  end
end
