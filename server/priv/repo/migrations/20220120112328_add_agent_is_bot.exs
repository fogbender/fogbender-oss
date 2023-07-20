defmodule Fog.Repo.Migrations.AddAgentIsBot do
  use Ecto.Migration

  def change do
    alter table(:agent) do
      add(:is_bot, :boolean, null: false, default: false)
    end

    execute("UPDATE agent SET is_bot = true where email not like '%@%'", "")
  end
end
