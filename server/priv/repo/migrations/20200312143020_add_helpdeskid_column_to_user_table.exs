defmodule Fog.Repo.Migrations.AddHelpdeskidColumnToUserTable do
  use Ecto.Migration

  def change do
    alter table(:user) do
      add(:helpdesk_id, :bigint, null: false, default: 0)
      remove(:customer_workspace_id)
    end

    create(unique_index(:user, [:helpdesk_id, :email], name: "user_email_uniq_index"))

    create(
      unique_index(:user, [:helpdesk_id, :external_uid], name: "user_external_uid_uniq_index")
    )
  end
end
