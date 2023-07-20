defmodule Fog.Repo.Migrations.AddHelpdeskIntegrationTable do
  use Ecto.Migration

  def change do
    create table(:helpdesk_integration) do
      add(:helpdesk_id, :bigint, null: false)
      add(:type, :text, null: false)
      add(:specifics, :map, null: false)

      timestamps()
    end

    create(
      unique_index(:helpdesk_integration, [:helpdesk_id, :type], name: :helpdesk_id_type_uq_index)
    )
  end
end
