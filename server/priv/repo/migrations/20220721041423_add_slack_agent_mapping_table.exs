defmodule Fog.Repo.Migrations.AddSlackAgentMappingTable do
  use Ecto.Migration

  def change do
    create table(:slack_agent_mapping, primary_key: false) do
      add(:agent_id, :bigint, null: false)
      add(:slack_team_id, :text, null: false)
      add(:slack_user_id, :text, null: false)

      timestamps()
    end

    create(index(:slack_agent_mapping, [:agent_id]))
    create(index(:slack_agent_mapping, [:slack_team_id, :slack_user_id]))

    create(unique_index(:slack_agent_mapping, [:agent_id, :slack_team_id, :slack_user_id]))
  end
end
