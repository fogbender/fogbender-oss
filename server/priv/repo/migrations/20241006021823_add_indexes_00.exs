defmodule Fog.Repo.Migrations.AddIndexes00 do
  use Ecto.Migration

  def change do
    create(
      index(:seen, [:room_id, :agent_id],
        where: "agent_id IS NOT NULL",
        name: :seen_room_id_agent_id_prtl_index
      )
    )

    create(
      index(:seen, [:room_id, :user_id],
        where: "user_id IS NOT NULL",
        name: :seen_room_id_user_id_prtl_index
      )
    )

    create(
      index(:room_membership, [:helpdesk_id, :room_id, :agent_id],
        where: "agent_id IS NOT NULL",
        name: :room_membership_helpdesk_id_room_id_agent_id_prtl_index
      )
    )

    create(
      index(:room_membership, [:helpdesk_id, :room_id, :user_id],
        where: "user_id IS NOT NULL",
        name: :room_membership_helpdesk_id_room_id_user_id_prtl_index
      )
    )
  end
end
