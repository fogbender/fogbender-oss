defmodule Fog.Repo.Migrations.AddMessageTextBigmIndex do
  use Ecto.Migration

  def up do
    execute(
      "CREATE INDEX message_text_bigm_index ON message USING gin (lower(text) gin_bigm_ops);"
    )
  end

  def down do
    execute("DROP INDEX message_text_bigm_index;")
  end
end
