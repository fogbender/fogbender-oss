defmodule Fog.Repo.Migrations.AddDescriptionToWorkspace do
  use Ecto.Migration

  def change do
    alter table(:workspace) do
      add(:description, :string)
    end
  end
end
