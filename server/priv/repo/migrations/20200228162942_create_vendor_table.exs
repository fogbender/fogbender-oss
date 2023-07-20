defmodule Fog.Repo.Migrations.CreateVendorTable do
  use Ecto.Migration

  def change do
    create table(:vendor, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:name, :text)

      timestamps()
    end
  end
end
