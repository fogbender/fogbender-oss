defmodule Fog.Repo.AgentSchedule do
  import Ecto.Query

  alias Fog.{Repo, Data}

  def oncall_now(v) do
    oncall(v, DateTime.utc_now())
  end

  def oncall(v, dt) do
    day_of_week = dt |> Date.day_of_week()
    time = dt |> DateTime.to_time()
    week = Integer.floor_div(dt.day, 7) + 1

    sq =
      from(
        s in Data.AgentSchedule,
        where: s.vendor_id == ^v.id,
        where: is_nil(s.deleted_at),
        where:
          fragment(
            "? BETWEEN ? AND ?",
            ^dt,
            coalesce(s.start_date, "1900-01-01"),
            coalesce(s.finish_date, "2999-12-31")
          ),
        where: fragment("? BETWEEN ? AND ?", ^time, s.start_time, s.finish_time),
        where: ^day_of_week in s.day,
        where: ^week in s.week,
        where: s.available == true
      )

    from(
      s0 in sq,
      left_join: s1 in Data.AgentSchedule,
      on: s0.id == s1.id and s0.available == s1.available,
      join: a in Data.Agent,
      on: a.id == s1.agent_id,
      select: a
    )
    |> Repo.all()
  end
end
