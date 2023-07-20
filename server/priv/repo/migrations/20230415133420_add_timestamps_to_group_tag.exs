defmodule Fog.Repo.Migrations.AddTimestampsToGroupTag do
  use Ecto.Migration

  def change do
    alter table(:room_tag) do
      timestamps(default: "2023-04-15 00:00:01", null: false)
    end
  end
end
