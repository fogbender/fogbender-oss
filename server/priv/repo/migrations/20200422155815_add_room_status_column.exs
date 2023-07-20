defmodule Fog.Repo.Migrations.AddRoomStatusColumn do
  use Ecto.Migration

  def change do
    alter table(:room) do
      add(:status, :text, null: false, default: "active")
    end
  end
end
