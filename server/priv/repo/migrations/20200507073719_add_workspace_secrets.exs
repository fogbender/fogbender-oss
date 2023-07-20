defmodule Fog.Repo.Migrations.AddWorkspaceSecrets do
  use Ecto.Migration

  def change do
    alter table(:workspace) do
      add(:signature_type, :text, null: true)
      add(:signature_secret, :text, null: true)
    end
  end
end
