defmodule Fog.Repo.Migrations.AddRoomTagTagIdIdx do
  use Ecto.Migration

  def change do
    create(index(:room_tag, [:tag_id]))
  end
end
