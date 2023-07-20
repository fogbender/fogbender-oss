defmodule Fog.Repo.Migrations.AddFeatureOptionMuteResolvedRooms do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:mute_resolved_rooms, :boolean, null: true)
    end
  end
end
