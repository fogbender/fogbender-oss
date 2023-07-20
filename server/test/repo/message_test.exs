defmodule Test.Repo.Message do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  alias Fog.{Repo, Data}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    a = agent(workspace)
    h = helpdesk(workspace)
    u = user(h)
    r1 = public_room(h, "R1")
    r2 = public_room(h, "R2")
    r3 = public_room(h, "R3")
    Kernel.binding()
  end

  describe "forwards sources" do
    test "multiple forward sources", ctx do
      m1 = message(ctx.r1, ctx.u, "M1")
      fw1 = forward(ctx.r2, ctx.a, [m1])
      m2 = message(ctx.r2, ctx.u, "M2")
      fw2 = forward(ctx.r3, ctx.a, [fw1, m2])

      fw1_id = fw1.id
      fw2_id = fw2.id

      assert [
               {^fw1_id, %Data.Message{text: "M1"}},
               {^fw2_id, %Data.Message{text: "M1"}},
               {^fw2_id, %Data.Message{text: "M2"}}
             ] = Repo.Message.sources([fw1_id, fw2_id])
    end

    test "keep sources order accross multiple forwards", ctx do
      m1 = message(ctx.r1, ctx.u, "M1")
      m2 = message(ctx.r1, ctx.u, "M2")
      m3 = message(ctx.r1, ctx.u, "M3")

      fw1 = forward(ctx.r2, ctx.a, [m3])
      _fw2 = forward(ctx.r2, ctx.a, [m1])
      _fw3 = forward(ctx.r2, ctx.a, [m1, m2])
      m4 = message(ctx.r2, ctx.u, "M4")

      fw4 = forward(ctx.r3, ctx.a, [fw1, m4])

      fw4_id = fw4.id

      assert [
               {^fw4_id, %Data.Message{text: "M3"}},
               {^fw4_id, %Data.Message{text: "M1"}},
               {^fw4_id, %Data.Message{text: "M1"}},
               {^fw4_id, %Data.Message{text: "M2"}},
               {^fw4_id, %Data.Message{text: "M4"}}
             ] = Repo.Message.sources([fw4_id])
    end

    test "don't resolve forwarded reply sources", ctx do
      m1 = message(ctx.r1, ctx.u, "M1")
      m2 = message(ctx.r1, ctx.u, "M2")

      fw1 = forward(ctx.r2, ctx.a, [m1, m2])
      m3 = message(ctx.r2, ctx.u, "M3")
      r1 = reply(ctx.r2, ctx.a, [fw1, m3], "R1")

      fw2 = forward(ctx.r3, ctx.a, [r1])

      {r1_id, fw2_id} = {r1.id, fw2.id}

      assert [
               {^r1_id, %Data.Message{text: "M1"}},
               {^r1_id, %Data.Message{text: "M2"}},
               {^r1_id, %Data.Message{text: "M3"}},
               {^fw2_id, %Data.Message{text: "R1"}}
             ] = Repo.Message.sources([r1_id, fw2_id])
    end
  end
end
