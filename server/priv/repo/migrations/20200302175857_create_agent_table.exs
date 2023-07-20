defmodule Fog.Repo.Migrations.CreateAgentTable do
  use Ecto.Migration

  def change do
    create table(:agent, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:email, :text, null: false)
      add(:name, :text, null: false)

      timestamps()
    end

    create(unique_index(:agent, [:email]))
  end
end
