defmodule Fog.Repo.Migrations.AddEmailInfoCacheTable do
  use Ecto.Migration

  def change do
    create table(:email_info_cache) do
      add(:email, :text, null: false)
      add(:provider, :text, null: false)
      add(:info, :map, null: false)

      timestamps()
    end

    create(unique_index(:email_info_cache, [:email, :provider], name: :email_provider_uq_index))
  end
end
