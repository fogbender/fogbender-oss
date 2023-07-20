defmodule Fog.Repo.Migrations.CreateOrg do
  use Ecto.Migration

  def change do
    create table(:org) do
      add(:name, :string)
      add(:domain, :string)
      add(:logo, :string)
      add(:site, :string)

      timestamps()
    end
  end
end
