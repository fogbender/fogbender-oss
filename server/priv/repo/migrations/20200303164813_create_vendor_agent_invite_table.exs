defmodule Fog.Repo.Migrations.CreateVendorAgentInviteTable do
  use Ecto.Migration

  def change do
    create table(:vendor_agent_invite, primary_key: false) do
      add(:vendor_id, :bigint, primary_key: true)
      add(:email, :text, primary_key: true)
      add(:code, :text, primary_key: true)
      add(:from_agent_id, :bigint, null: false)

      timestamps()
    end
  end
end
