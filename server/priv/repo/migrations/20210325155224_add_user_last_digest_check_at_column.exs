defmodule Fog.Repo.Migrations.AddUserLastDigestCheckAtColumn do
  use Ecto.Migration

  def change do
    alter table(:user) do
      add(:last_digest_check_at, :timestamp, null: true)
    end
  end
end
