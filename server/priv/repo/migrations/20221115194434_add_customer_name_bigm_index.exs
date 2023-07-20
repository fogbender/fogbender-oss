defmodule Fog.Repo.Migrations.AddCustomerNameBigmIndex do
  use Ecto.Migration

  def up do
    execute(
      "CREATE INDEX customer_name_bigm_index ON customer USING gin (lower(name) gin_bigm_ops);"
    )
  end

  def down do
    execute("DROP INDEX customer_name_bigm_index;")
  end
end
