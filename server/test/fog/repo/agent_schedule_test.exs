defmodule Test.Repo.AgentScheduleTest do
  use Fog.RepoCase, async: true
  alias Fog.{Data, Repo}

  setup do
    v = vendor()
    w = workspace(v)

    a0 = agent(w, "agent", "A00")
    a1 = agent(w, "agent", "A01")

    Kernel.binding()
  end

  test "create agent schedule", ctx do
    _s =
      agent_schedule(
        vendor: ctx.v,
        agent: ctx.a0,
        start_time: "08:30:00",
        finish_time: "16:30:00",
        day: [1, 2, 5],
        week: [1, 2, 3],
        month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        available: true
      )

    {:ok, dt, 0} = DateTime.from_iso8601("2014-01-23T23:50:07Z")
    assert [] = Repo.AgentSchedule.oncall(ctx.v, dt)

    {:ok, dt, 0} = DateTime.from_iso8601("2015-01-13T09:14:00Z")
    agent_id = ctx.a0.id
    assert [%Data.Agent{id: ^agent_id}] = Repo.AgentSchedule.oncall(ctx.v, dt)
  end

  test "create agent schedule with unavailability", ctx do
    agent_schedule(
      vendor: ctx.v,
      agent: ctx.a0,
      start_time: "08:30:00",
      finish_time: "16:30:00",
      day: [1, 2, 5],
      week: [1, 2, 3],
      month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      available: true
    )

    # lunch
    agent_schedule(
      vendor: ctx.v,
      agent: ctx.a0,
      start_time: "12:00:00",
      finish_time: "12:30:00",
      day: [1, 2, 5],
      week: [1, 2, 3],
      month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      available: false
    )

    {:ok, dt, 0} = DateTime.from_iso8601("2015-01-13T11:35:00Z")
    agent_id = ctx.a0.id
    assert [%Data.Agent{id: ^agent_id}] = Repo.AgentSchedule.oncall(ctx.v, dt)

    {:ok, dt, 0} = DateTime.from_iso8601("2015-01-13T12:15:00Z")
    agent_id = ctx.a0.id
    assert [%Data.Agent{id: ^agent_id}] = Repo.AgentSchedule.oncall(ctx.v, dt)
  end

  test "schedule with two agents", ctx do
    agent_schedule(
      vendor: ctx.v,
      agent: ctx.a0,
      start_time: "08:30:00",
      finish_time: "16:30:00",
      day: [1, 2, 5],
      week: [1, 2, 3],
      month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      available: true
    )

    agent_schedule(
      vendor: ctx.v,
      agent: ctx.a1,
      start_time: "16:00:00",
      finish_time: "23:30:00",
      day: [1, 2, 5],
      week: [1, 2, 3],
      month: [1, 2],
      available: true
    )

    {:ok, dt, 0} = DateTime.from_iso8601("2015-01-13T11:35:00Z")
    agent_id = ctx.a0.id
    assert [%Data.Agent{id: ^agent_id}] = Repo.AgentSchedule.oncall(ctx.v, dt)

    {:ok, dt, 0} = DateTime.from_iso8601("2015-01-13T16:15:00Z")
    agent0_id = ctx.a0.id
    agent1_id = ctx.a1.id

    assert [%Data.Agent{id: ^agent0_id}, %Data.Agent{id: ^agent1_id}] =
             Repo.AgentSchedule.oncall(ctx.v, dt) |> Enum.sort(&(&1.name < &2.name))
  end
end
