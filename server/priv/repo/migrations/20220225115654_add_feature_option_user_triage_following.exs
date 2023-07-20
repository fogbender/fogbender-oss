defmodule Fog.Repo.Migrations.AddFeatureOptionUserTriageFollowing do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:user_triage_following, :boolean, null: true)
    end
  end
end
