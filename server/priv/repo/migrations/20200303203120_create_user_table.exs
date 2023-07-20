defmodule Fog.Repo.Migrations.CreateUserTable do
  use Ecto.Migration

  def change do
    create table(:user, primary_key: false) do
      add(:id, :bigint, primary_key: true)
      add(:customer_workspace_id, :bigint, null: false)
      add(:email, :text, null: false)
      add(:name, :text, null: false)
      add(:external_uid, :text, null: true)

      timestamps()
    end

    create(unique_index(:user, [:customer_workspace_id, :email], name: "user_email_uniq_index"))

    create(
      unique_index(:user, [:customer_workspace_id, :external_uid],
        name: "user_external_uid_uniq_index"
      )
    )
  end
end
