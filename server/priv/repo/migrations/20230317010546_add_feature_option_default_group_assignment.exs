defmodule Fog.Repo.Migrations.AddFeatureOptionDefaultGroupAssignment do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:default_group_assignment, :text, null: true)
    end
  end
end
