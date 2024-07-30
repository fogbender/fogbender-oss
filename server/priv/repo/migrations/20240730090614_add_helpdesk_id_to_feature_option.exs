defmodule Fog.Repo.Migrations.AddHelpdeskIdToFeatureOption do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:helpdesk_id, :bigint, null: true)
    end

    create(unique_index(:feature_option, [:helpdesk_id]))
  end
end
