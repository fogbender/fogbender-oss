defmodule Fog.Repo.Migrations.CreateFeatureOptionTable do
  use Ecto.Migration

  def change do
    create table(:feature_option) do
      add(:vendor_id, :bigint, null: true)
      add(:workspace_id, :bigint, null: true)
      add(:user_id, :bigint, null: true)
      add(:agent_id, :bigint, null: true)

      add(:tag_scope_enabled, :boolean, null: true)
      add(:email_digest_enabled, :boolean, null: true)
      add(:email_digest_period, :int, null: true)

      timestamps()
    end

    create(unique_index(:feature_option, [:vendor_id]))
    create(unique_index(:feature_option, [:workspace_id]))
    create(unique_index(:feature_option, [:user_id]))
  end
end
