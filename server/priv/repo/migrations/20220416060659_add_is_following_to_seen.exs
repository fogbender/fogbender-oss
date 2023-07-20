defmodule Fog.Repo.Migrations.AddIsFollowingToSeen do
  use Ecto.Migration

  def change do
    alter table(:seen) do
      add(:is_following, :boolean, default: true)
    end
  end
end
