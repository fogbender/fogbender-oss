defmodule Fog.Repo.Migrations.CreateFileTable do
  use Ecto.Migration

  def change do
    create table(:file, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:message_id, :bigint, null: true)
      add(:filename, :string, null: false)
      add(:content_type, :string, null: false)
      add(:data, :map)
      timestamps()
    end

    create(index(:file, [:message_id]))
  end
end
