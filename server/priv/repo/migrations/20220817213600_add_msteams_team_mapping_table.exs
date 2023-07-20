defmodule Fog.Repo.Migrations.AddMsteamsTeamMappingTable do
  use Ecto.Migration

  def change do
    create table(:msteams_team_mapping, primary_key: false) do
      add(:team_id, :text, null: false)
      add(:team_aad_group_id, :text, null: false)

      timestamps()
    end

    create(unique_index(:msteams_team_mapping, [:team_id, :team_aad_group_id]))
  end
end
