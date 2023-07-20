defmodule Fog.Repo.Migrations.CreateSubscibeForm do
  use Ecto.Migration

  def change do
    create table(:subsciption_emails) do
      add(:email, :string, null: false)
      add(:user_info, :string)

      timestamps()
    end
  end
end
