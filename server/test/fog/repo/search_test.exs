defmodule Test.Repo.Search do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  alias Fog.Repo

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    my_agent = agent(workspace)

    ha = helpdesk(workspace, true)
    a1 = agent(workspace)
    ha_public = public_room(ha, "ha_public")

    binding()
  end

  describe "Search messages in room" do
    test "case insensitive", ctx do
      message(ctx.ha_public, ctx.a1, "Test message 1")
      message(ctx.ha_public, ctx.a1, "TEST message 2")
      message(ctx.ha_public, ctx.a1, "I need help!")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "test"})
        |> Enum.map(& &1.text)

      assert [
               "TEST message 2",
               "Test message 1"
             ] = res
    end

    test "respect full term match", ctx do
      message(ctx.ha_public, ctx.a1, "Sometimes I need help")
      message(ctx.ha_public, ctx.a1, "I need some help!")
      message(ctx.ha_public, ctx.a1, "Last time it helped")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "need some help", limit: 2})
        |> Enum.map(& &1.text)

      assert [
               "I need some help!",
               "Sometimes I need help"
             ] = res
    end

    test "respect wildcard term match", ctx do
      message(ctx.ha_public, ctx.a1, "it was very helpfull")
      message(ctx.ha_public, ctx.a1, "Last time it helped very well")
      message(ctx.ha_public, ctx.a1, "I'm very happy for you help!")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "very help"})
        |> Enum.map(& &1.text)

      assert res == [
               "it was very helpfull",
               "I'm very happy for you help!",
               "Last time it helped very well"
             ]
    end

    test "respect count of matched full term words", ctx do
      message(ctx.ha_public, ctx.a1, "Tested with version 556. It worked well. Now it's broken.")
      message(ctx.ha_public, ctx.a1, "Now I need to check all versions")
      message(ctx.ha_public, ctx.a1, "Well, versions do not match. Don't know what happened")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "well now version"})
        |> Enum.map(& &1.text)

      assert [
               "Tested with version 556. It worked well. Now it's broken.",
               "Well, versions do not match. Don't know what happened",
               "Now I need to check all versions"
             ] = res
    end

    test "respect count of matched wildcarded term words", ctx do
      message(ctx.ha_public, ctx.a1, "Versions seems to be tested well. ")

      message(
        ctx.ha_public,
        ctx.a1,
        "Tested with versions 100 and 101. Worked properly. Now it's broken."
      )

      message(ctx.ha_public, ctx.a1, "Well, versions do not match.")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "test version work"})
        |> Enum.map(& &1.text)

      assert [
               "Tested with versions 100 and 101. Worked properly. Now it's broken.",
               "Versions seems to be tested well. ",
               "Well, versions do not match."
             ] = res
    end

    test "respect more recent message in case of similar relevance", ctx do
      message(ctx.ha_public, ctx.a1, "Test 1")
      message(ctx.ha_public, ctx.a1, "Test 2")
      message(ctx.ha_public, ctx.a1, "Test 3")
      message(ctx.ha_public, ctx.a1, "not tested")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "test", limit: 2})
        |> Enum.map(& &1.text)

      assert [
               "Test 3",
               "Test 2"
             ] = res
    end

    test "respect forwarded messages text", ctx do
      r2 = public_room(ctx.ha, "R2")
      blue = message(r2, ctx.a1, "Test blue")
      red = message(r2, ctx.a1, "Test red")
      green = message(ctx.ha_public, ctx.a1, "Test green")
      yellow = message(ctx.ha_public, ctx.a1, "Test yellow")
      f = forward(ctx.ha_public, ctx.a1, [blue, red])
      _zero = message(ctx.ha_public, ctx.a1, "ZERO")

      res =
        Repo.Search.room_messages(%{room_id: ctx.ha_public.id, term: "blue red yel", limit: 5})
        |> Enum.map(& &1.id)

      assert [
               f.id,
               yellow.id,
               green.id
             ] == res
    end
  end
end
