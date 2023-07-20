defmodule Fog.Repo.Migrations.CreateFogviteCodeTable do
  use Ecto.Migration

  def change do
    create table(:fogvite_code, primary_key: false) do
      add(:code, :string, primary_key: true)
      add(:limit, :bigint)
      add(:disabled, :boolean, default: false)
      timestamps()
    end
  end
end
