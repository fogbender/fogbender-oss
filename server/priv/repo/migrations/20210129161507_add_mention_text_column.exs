defmodule Fog.Repo.Migrations.AddMentionTextColumn do
  use Ecto.Migration

  def change do
    alter table(:mention) do
      add(:text, :text, null: true)
    end
  end
end
