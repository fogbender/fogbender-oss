defmodule Fog.Repo.Migrations.AddHelpdeskIdToMsteamsUserMappingTable do
  use Ecto.Migration

  def change do
    alter table(:msteams_user_mapping) do
      add(:helpdesk_id, :bigint, null: false)
    end
  end
end
