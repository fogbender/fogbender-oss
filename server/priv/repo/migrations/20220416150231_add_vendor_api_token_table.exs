defmodule Fog.Repo.Migrations.AddVendorApiTokenTable do
  use Ecto.Migration

  def change do
    create table(:vendor_api_token) do
      add(:vendor_id, :bigint)
      add(:created_by_agent_id, :bigint)
      add(:description, :text, null: true)
      add(:scopes, {:array, :string})
      add(:is_deleted, :boolean, default: false)
      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)
      timestamps()
    end

    create(index(:vendor_api_token, [:vendor_id]))
  end
end
