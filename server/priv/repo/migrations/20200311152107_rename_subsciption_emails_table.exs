defmodule Fog.Repo.Migrations.RenameSubsciptionEmailsTable do
  use Ecto.Migration

  def change do
    rename(table("subsciption_emails"), to: table("subscription_emails"))
  end
end
