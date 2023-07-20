defmodule Fog.Repo.Migrations.AddVendorStatusColumn do
  use Ecto.Migration

  def change do
    alter table(:vendor) do
      add(:status, :text, null: false, default: "active")
    end
  end
end
