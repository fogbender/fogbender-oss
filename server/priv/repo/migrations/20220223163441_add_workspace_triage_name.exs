defmodule Fog.Repo.Migrations.AddWorkspaceTriageName do
  use Ecto.Migration

  def change do
    alter table(:workspace) do
      add(:triage_name, :text, null: false, default: "Triage")
    end
  end
end
