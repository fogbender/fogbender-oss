defmodule Fog.Repo.Migrations.AddTargetMessageIdIndexToMessageLink do
  use Ecto.Migration

  def change do
    create(index(:message_link, [:target_message_id]))
  end
end
