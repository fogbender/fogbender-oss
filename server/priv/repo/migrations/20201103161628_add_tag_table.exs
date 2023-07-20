defmodule Fog.Repo.Migrations.AddTagTable do
  use Ecto.Migration

  def change do
    create table(:tag, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:workspace_id, :bigint)
      add(:name, :text)

      timestamps()
    end

    create(unique_index(:tag, [:workspace_id, :name]))

    create table(:room_tag) do
      add(:room_id, :bigint)
      add(:tag_id, :bigint)
    end

    create(unique_index(:room_tag, [:room_id, :tag_id]))
  end
end
