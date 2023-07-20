defmodule Fog.Repo.Migrations.AddTimestamptsToUserTags do
  use Ecto.Migration

  def change do
    alter table(:author_tag) do
      timestamps(default: "2020-11-01 00:00:01", null: false)
    end
  end
end
