defmodule Fog.Repo.Migrations.CreateDetectiveTable do
  use Ecto.Migration

  def change do
    create table(:detective, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:email, :text, null: false)
      add(:name, :text, null: false)

      timestamps()
    end

    create(unique_index(:detective, [:email]))
  end
end
