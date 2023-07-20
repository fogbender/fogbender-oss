defmodule Fog.Repo.Migrations.AddFeatureOptionAvatarLibraryUrl do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:avatar_library_url, :text, null: true)
    end
  end
end
