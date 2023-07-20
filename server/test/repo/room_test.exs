defmodule Test.Repo.Room do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  setup do
    v = vendor()
    w = workspace(v)
    h = helpdesk(w)
    r1 = public_room(h, "R1")
    a = agent(w)
    Kernel.binding()
  end

  test "resolve", ctx do
    assert %Data.Room{resolved: false} = Repo.Room.get(ctx.r1.id)
    assert %Data.Room{resolved: true} = Repo.Room.resolve(ctx.r1.id, true, ctx.a.id)

    assert %Data.Room{
             resolved: true,
             resolved_by_agent_id: a_id,
             resolved_at: at,
             resolved_til: nil
           } = Repo.Room.get(ctx.r1.id)

    assert not is_nil(at)
    assert a_id == ctx.a.id
  end

  test "unresolve", ctx do
    assert %Data.Room{resolved: true} = Repo.Room.resolve(ctx.r1.id, true, ctx.a.id)
    assert %Data.Room{resolved: false} = Repo.Room.resolve(ctx.r1.id, false, ctx.a.id)
    assert %Data.Room{resolved: false} = Repo.Room.get(ctx.r1.id)
  end

  test "resolve til", ctx do
    assert %Data.Room{resolved: true} =
             Repo.Room.resolve(ctx.r1.id, true, ctx.a.id, ~U[2022-01-01 01:00:00.000000Z])

    assert %Data.Room{resolved: true, resolved_til: ~U[2022-01-01 01:00:00.000000Z]} =
             Repo.Room.get(ctx.r1.id)
  end

  test "unresolve_timeouted", ctx do
    r2 = public_room(ctx.h, "R2")
    Repo.Room.resolve(ctx.r1.id, true, ctx.a.id, ~U[2022-01-01 01:00:00.000000Z])
    Repo.Room.resolve(r2.id, true, ctx.a.id, ~U[2022-02-01 01:00:00.000000Z])

    assert {_, [%Data.Room{name: "R1", resolved: false}]} =
             Repo.Room.unresolve_timeouted(~U[2022-01-02 01:00:00.000000Z])

    assert [{"R1", false}, {"R2", true}] =
             from(r in Data.Room,
               select: {r.name, r.resolved},
               order_by: r.name
             )
             |> Repo.all()
  end

  test "with_agent", ctx do
    [h, a] = [ctx.h, ctx.a]
    ha = internal_helpdesk(ctx.w)
    u1 = user(h)
    a1 = agent(ctx.w)
    a2 = agent(ctx.w)
    pub_a = public_room(ha, "Internal public room")
    priv_a = private_room(ha, [a1, a], "Agent private")
    dialog_a = dialog_room(ha, [a, a1], "Agent dialog")
    group(ctx.v, a, "test")
    group(ctx.v, a1, "noaccess")
    priv_ga = private_room(ha, [], "Group test private") |> room_group("test")
    priv_u = private_room(h, [a, u1], "User private")
    dialog_u = dialog_room(h, [a, u1], "User dialog")
    priv_gu = private_room(h, [u1], "Group test private user") |> room_group("test")

    # no access
    private_room(ha, [a1], "Internal private room (no access)")
    private_room(h, [u1], "User private room (no access)")
    private_room(ha, [], "Group private room (no access)") |> room_group("noaccess")

    dialog_room(h, [u1, a1], "User dialog (no access)")
    dialog_room(ha, [a1, a2], "Agent dialog (no access)")

    assert [
             {ctx.r1.id, "R1"},
             {pub_a.id, "Internal public room"},
             {priv_a.id, "Agent private"},
             {dialog_a.id, dialog_a.name},
             {priv_ga.id, "Group test private"},
             {priv_u.id, "User private"},
             {dialog_u.id, dialog_u.name},
             {priv_gu.id, "Group test private user"}
           ] ==
             Repo.Room.with_agent(a.id)
             |> Repo.all()
             |> Enum.map(&{&1.id, &1.name})
             |> Enum.sort()
  end
end
