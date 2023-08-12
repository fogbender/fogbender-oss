defmodule Fog.Repo.Migrations.AddFreeSeatsToVendor do
  use Ecto.Migration

  def change do
    alter table(:vendor) do
      add(:free_seats, :integer, default: 2)
    end
  end
end
