defmodule Fog.Repo.Migrations.CreateCustomerWorkspaceMembershipTable do
  use Ecto.Migration

  def change do
    create table(:customer_workspace, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:customer_id, :bigint, null: false)
      add(:workspace_id, :bigint, null: false)
      add(:name, :text, null: true)

      timestamps()
    end
  end
end
