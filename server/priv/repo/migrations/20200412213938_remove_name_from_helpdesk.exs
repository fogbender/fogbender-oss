defmodule Fog.Repo.Migrations.RemoveNameFromHelpdesk do
  use Ecto.Migration

  def change do
    alter table("helpdesk") do
      remove(:name)
    end
  end
end
