defmodule Fog.Repo.Migrations.AddFeatureOptionAgentCustomerFollowing do
  use Ecto.Migration

  def change do
    alter table(:feature_option) do
      add(:agent_customer_following, :boolean, null: true)
    end
  end
end
