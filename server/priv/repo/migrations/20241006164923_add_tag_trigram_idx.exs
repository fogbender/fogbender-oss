defmodule Fog.Repo.Migrations.AddTagTrigramIdx do
  use Ecto.Migration

  def change do
    execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    execute("""
    CREATE INDEX idx_tag_name_trigram ON tag USING gin (name gin_trgm_ops);
    """)
  end
end
