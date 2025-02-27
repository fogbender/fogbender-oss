defmodule Fog.Repo.Migrations.AddLlmThreadRoomTable do
  use Ecto.Migration

  def change do
    create table(:llm_thread_room_mapping, primary_key: false) do
      add(:room_id, :bigint, null: false, primary_key: true)
      add(:thread_id, :text, null: false, primary_key: true)
      add(:provider, :text, null: false, primary_key: true)

      timestamps()
    end
  end
end
