defmodule Fog.Repo.Migrations.AddVisitorKeyToWorkspace do
  use Ecto.Migration

  def change do
    alter table(:workspace) do
      add(:visitor_key, :text)
      add(:visitor_enabled, :boolean, default: false)
    end
  end
end
