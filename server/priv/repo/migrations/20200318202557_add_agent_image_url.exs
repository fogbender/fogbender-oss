defmodule Fog.Repo.Migrations.AddAgentImageUrl do
  use Ecto.Migration

  def change do
    alter table(:agent) do
      add(:image_url, :text)
    end
  end
end
