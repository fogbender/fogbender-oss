defmodule Fog.Repo.Migrations.RenameMsteamsConnectCodeTable do
  use Ecto.Migration

  def change do
    rename(table(:msteams_connect_code), to: table(:connect_code))
  end
end
