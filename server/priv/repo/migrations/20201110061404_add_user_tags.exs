defmodule Fog.Repo.Migrations.AddUserTags do
  use Ecto.Migration

  def change do
    create table(:author_tag) do
      add(:agent_id, :bigint, null: true)
      add(:user_id, :bigint, null: true)
      add(:tag_id, :bigint)
    end

    create(unique_index(:author_tag, [:agent_id, :tag_id]))
    create(unique_index(:author_tag, [:user_id, :tag_id]))

    create(
      constraint(:author_tag, "non_null_author",
        check: "coalesce(nullif(agent_id, '0') , '0' ) != coalesce(nullif(user_id, '0') , '0' )"
      )
    )
  end
end
