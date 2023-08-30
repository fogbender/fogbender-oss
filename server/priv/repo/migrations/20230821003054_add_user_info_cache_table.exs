defmodule Fog.Repo.Migrations.AddUserInfoCacheTable do
  use Ecto.Migration

  def change do
    create table(:user_info_cache) do
      add(:user_id, :bigint, null: false)
      add(:provider, :text, null: false)
      add(:info, :map, null: false)

      timestamps()
    end

    create(
      unique_index(:user_info_cache, [:user_id, :provider], name: :user_id_provider_uq_index)
    )
  end
end
