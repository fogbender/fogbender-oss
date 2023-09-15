defmodule Fog.Repo.Migrations.AddAgentSchedulingEnabledToVendor do
  use Ecto.Migration

  def change do
    alter table(:vendor) do
      add(:agent_scheduling_enabled, :boolean, default: false)
    end
  end
end
