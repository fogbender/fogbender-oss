defmodule Test.Repo.RoomMembership do
  use Fog.RepoCase, async: true
  alias Fog.Utils

  setup do
    v = vendor()
    w = workspace(v)
    h = helpdesk(w)
    [u1, u2, u3] = users(3, h)
    [a1, a2, a3] = agents(3, w)
    group(v, a1, "g1")
    group(v, a1, "g2")
    group(v, a2, "g3")

    rg1 =
      private_room(h, [a1, u1], "RG1")
      |> room_group("g1")
      |> room_group("g2")

    rg2 =
      private_room(h, [a1, u2], "RG2")
      |> room_group("g3")

    rng = private_room(h, [a2, u1, u2], "RNG")

    v2 = vendor([a1, a2])
    group(v2, a1, "g1")
    group(v2, a2, "g3")
    h2 = workspace(v2) |> helpdesk()

    private_room(h2, [a1, a2], "Vendor 2 room")
    |> room_group("g3")

    Kernel.binding()
  end

  describe "with_room" do
    test "load members from groups without duplicates", ctx do
      assert check_with_room(ctx.rg1) == [
               ctx.a1.id,
               ctx.u1.id
             ]

      assert check_with_room(ctx.rg2) == [
               ctx.a1.id,
               ctx.a2.id,
               ctx.u2.id
             ]
    end

    test "load members without groups", ctx do
      assert check_with_room(ctx.rng) == [
               ctx.a2.id,
               ctx.u1.id,
               ctx.u2.id
             ]
    end
  end

  defp check_with_room(room) do
    Repo.RoomMembership.with_room(room.id)
    |> Repo.all()
    |> Enum.map(&Utils.coalesce([&1.user_id, &1.agent_id]))
    |> Enum.sort()
  end
end
