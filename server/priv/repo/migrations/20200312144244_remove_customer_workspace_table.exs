defmodule Fog.Repo.Migrations.RemoveCustomerWorkspaceTable do
  use Ecto.Migration

  def change do
    drop(table(:customer_workspace))
  end
end
