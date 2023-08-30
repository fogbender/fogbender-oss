defmodule Fog.Repo.Migrations.AddVisitorFieldsToUserTable do
  use Ecto.Migration

  def change do
    alter table(:user) do
      add(:is_visitor, :boolean, null: false, default: false)
      add(:email_verified, :boolean, null: false, default: true)
    end
  end
end
