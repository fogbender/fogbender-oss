defmodule Fog.Repo.Migrations.AddMsteamsUserMappingTable do
  use Ecto.Migration

  def change do
    create table(:msteams_user_mapping, primary_key: false) do
      add(:user_id, :bigint, null: false)
      add(:msteams_team_id, :text, null: false)
      add(:msteams_user_id, :text, null: false)

      timestamps()
    end

    create(index(:msteams_user_mapping, [:user_id]))
    create(index(:msteams_user_mapping, [:msteams_team_id, :msteams_user_id]))

    create(unique_index(:msteams_user_mapping, [:user_id, :msteams_team_id, :msteams_user_id]))
  end
end
