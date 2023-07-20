defmodule Fog.Repo.Migrations.RenameUserPictureToImageUrl do
  use Ecto.Migration

  def change do
    rename(table(:user), :picture, to: :image_url)
  end
end
