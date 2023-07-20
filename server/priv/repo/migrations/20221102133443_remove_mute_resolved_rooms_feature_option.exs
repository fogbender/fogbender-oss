defmodule Fog.Repo.Migrations.RemoveMuteResolvedRoomsFeatureOption do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      remove(:mute_resolved_rooms)
    end
  end
end
