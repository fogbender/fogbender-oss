defmodule Fog.Data.AgentSchedule do
  @moduledoc """
  We're using the word "schedule" to refer to a contiguous block of time when an agent is either
  available or unavailable.

  Thus, an agent can have multiple schedules. This way, an agent's "work calendar" is a set of all agent
  schedules for the given agent.

  The start_time and finish_time solumns are UTC timestamps - the client will have to ensure the UI is displaying the
  correct time zone.

  Repeatability is governed by the values of the "day" and "week" columns. We assume schedules
  repeat annually.

  "every day": the "day" column must have the value "1,2,3,4,5,6,7"

  "every Wednesday": the "day" column must have the value "3"

  "every second Wednesday": the "week" column must have the value "1,3"

  --

  grid: "two on, two off"
  grid: "last Wednesday of the month"

  """

  use Fog.Data
  alias Fog.Data.{Agent, Vendor}

  @derive {Jason.Encoder,
           only: [
             :id,
             :vendor_id,
             :agent_id,
             :start_date,
             :finish_date,
             :start_time,
             :finish_time,
             :available,
             :day,
             :week,
             :grid
           ]}
  @primary_key {:id, :binary_id, autogenerate: true}
  schema "agent_schedule" do
    field(:start_date, :utc_datetime_usec)
    field(:finish_date, :utc_datetime_usec)
    field(:start_time, :time)
    field(:finish_time, :time)
    field(:available, :boolean, default: true)
    field(:day, {:array, :integer})
    field(:week, {:array, :integer})
    field(:grid, :string)

    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    belongs_to(:agent, Agent, type: Fog.Types.AgentId)

    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    timestamps()
  end

  def changeset(model, params \\ %{}) do
    model
    |> cast(params, [
      :id,
      :vendor_id,
      :agent_id,
      :start_date,
      :finish_date,
      :start_time,
      :finish_time,
      :available,
      :day,
      :week,
      :grid,
      :deleted_at,
      :deleted_by_agent_id
    ])
    |> validate_required([:vendor_id, :agent_id, :start_time, :finish_time, :day, :week])
    |> unique_constraint(
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
  end
end
