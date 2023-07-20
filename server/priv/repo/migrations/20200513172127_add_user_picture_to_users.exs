defmodule Fog.Repo.Migrations.AddImageUrlToUsers do
  use Ecto.Migration

  def change do
    alter table(:user) do
      add(:picture, :text)
    end
  end
end
