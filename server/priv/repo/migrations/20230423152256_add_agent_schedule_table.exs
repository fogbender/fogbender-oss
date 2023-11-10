defmodule Fog.Repo.Migrations.AddAgentScheduleTable do
  use Ecto.Migration

  def change do
    create table(:agent_schedule, primary_key: false) do
      add(:id, :uuid, primary_key: true, null: false)
      add(:vendor_id, :bigint, null: false)
      add(:agent_id, :bigint, null: false)

      add(:start_date, :utc_datetime_usec, null: true)
      add(:finish_date, :utc_datetime_usec, null: true)

      add(:start_time, :time, null: false)
      add(:finish_time, :time, null: false)
      # 1,2,4,7 - mon, tue, thu, sun
      add(:day, {:array, :integer}, null: false)
      # 1, 3 - 1st week, 3rd week
      add(:week, {:array, :integer}, null: false)

      add(:grid, :text, null: true)

      add(:available, :boolean, default: true)

      add(:deleted_at, :utc_datetime_usec, null: true)
      add(:deleted_by_agent_id, :bigint, null: true)

      timestamps()
    end

    create(
      unique_index(
        :agent_schedule,
        [
          :vendor_id,
          :agent_id,
          :start_date,
          :finish_date,
          :start_time,
          :finish_time,
          :day,
          :week,
          :grid,
          :available
        ],
        name: :agent_schedule_ux
      )
    )
  end
end
