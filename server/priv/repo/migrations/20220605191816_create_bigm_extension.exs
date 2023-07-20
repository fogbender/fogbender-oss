defmodule Fog.Repo.Migrations.CreateBigmExtension do
  use Ecto.Migration

  def up do
    execute("CREATE EXTENSION IF NOT EXISTS pg_bigm;")
  end

  def down do
    execute("DROP EXTENSION pg_bigm;")
  end
end
