defmodule Fog.Repo.Migrations.AddDisplayNamesToRoomTable do
  use Ecto.Migration

  def change do
    alter table(:room) do
      add(:display_name_for_user, :text)
      add(:display_name_for_agent, :text)
    end
  end
end
