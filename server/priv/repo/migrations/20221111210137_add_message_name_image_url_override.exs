defmodule Fog.Repo.Migrations.AddMessageNameImageUrlOverride do
  use Ecto.Migration

  def change do
    alter table(:message) do
      add(:from_name_override, :string)
      add(:from_image_url_override, :string)
    end
  end
end
