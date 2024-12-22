defmodule Fog.Repo.Migrations.FixSlackChannelMappingIndex do
  use Ecto.Migration

  def change do
    execute("""
    DELETE FROM slack_channel_mapping
    WHERE ctid NOT IN (
      SELECT ctid
      FROM (
        SELECT ctid, row_number() OVER (
          PARTITION BY room_id, channel_id
          ORDER BY thread_id::numeric DESC
        ) AS row_num
        FROM slack_channel_mapping
      ) subquery
      WHERE row_num = 1
    );
    """)

    create(
      unique_index(:slack_channel_mapping, [:room_id, :channel_id],
        name: :room_id_slack_channel_uq
      )
    )
  end
end
