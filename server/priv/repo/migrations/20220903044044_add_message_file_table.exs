defmodule Fog.Repo.Migrations.AddMessageFileTable do
  use Ecto.Migration

  import Ecto.Query

  def change do
    create table(:message_file, primary_key: false) do
      add(:message_id, :bigint, null: false)
      add(:file_id, :bigint, null: false)
      timestamps()
    end

    create(index(:message_file, [:message_id]))
    create(unique_index(:message_file, [:message_id, :file_id]))

    execute(
      query!(
        """
        insert into message_file (message_id, file_id, inserted_at, updated_at)
        select message_id, id, inserted_at, updated_at from file
        where message_id is not null
        """,
        []
      )
    )

    execute(
      query!(
        """
        update file set message_id = null
        """,
        []
      )
    )
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
