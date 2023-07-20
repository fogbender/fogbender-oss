defmodule Fog.Repo.Migrations.AddMsTeamsConnectCode do
  use Ecto.Migration

  import Ecto.Query

  def change do
    create table(:msteams_connect_code, primary_key: false) do
      add(:helpdesk_id, :bigint, null: false)
      add(:code, :text, null: false)

      timestamps()
    end

    create(unique_index(:msteams_connect_code, [:code]))
    create(unique_index(:msteams_connect_code, [:code, :helpdesk_id]))
  end
end
