defmodule Fog.Repo.Migrations.AddSlackCustomerUserMappingTable do
  use Ecto.Migration

  def change do
    create table(:slack_customer_user_mapping, primary_key: false) do
      add(:user_id, :bigint, null: false)
      add(:slack_team_id, :text, null: false)
      add(:slack_user_id, :text, null: false)
      add(:helpdesk_id, :bigint, null: false)

      timestamps()
    end

    create(index(:slack_customer_user_mapping, [:user_id]))
    create(index(:slack_customer_user_mapping, [:slack_team_id, :slack_user_id]))

    create(
      unique_index(:slack_customer_user_mapping, [
        :user_id,
        :slack_team_id,
        :slack_user_id,
        :helpdesk_id
      ])
    )
  end
end
