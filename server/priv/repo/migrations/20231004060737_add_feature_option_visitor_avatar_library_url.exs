defmodule Fog.Repo.Migrations.AddFeatureOptionVisitorAvatarLibraryUrl do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:visitor_avatar_library_url, :text, null: true)
    end
  end
end
