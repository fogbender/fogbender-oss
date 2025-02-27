defmodule Fog.Repo.Migrations.AddGithubInstallTable do
  use Ecto.Migration

  def change do
    create table(:github_install) do
      add(:installation_id, :integer)

      timestamps()
    end

    create(unique_index(:github_install, [:installation_id]))
  end
end
