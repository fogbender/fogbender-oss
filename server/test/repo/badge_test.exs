defmodule Test.Repo.Badge do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  alias Fog.{Repo, Data}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    a1 = agent(workspace)
    a2 = agent(workspace)
    h = helpdesk(workspace)
    ha = helpdesk(workspace, true)
    ra = public_room(ha, "RA1")
    pa = private_room(ha, [a1, a2], "PRA")
    u1 = user(h)
    u2 = user(h)
    ru = public_room(h, "R1")
    pu = private_room(h, [u1, u2], "PR")
    Kernel.binding()
  end

  describe "following field for agent" do
    test "should be 0 if not following room", ctx do
      message(ctx.ra, ctx.a1, "TEST @A2", [ctx.a2])
      a2_id = ctx.a2.id

      assert [%Data.Badge{agent_id: ^a2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)
    end

    test "should be 0 if unfollowed manually", ctx do
      m1 = message(ctx.ra, ctx.a1, "TEST @A2", [ctx.a2])
      seen(ctx.a2, ctx.ra, m1, false)
      message(ctx.ra, ctx.a1, "TEST 2 @A2", [ctx.a2])
      a2_id = ctx.a2.id

      assert [%Data.Badge{agent_id: ^a2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)
    end

    test "should be 1 on customer room with feature option", ctx do
      Repo.FeatureOption.agent_defaults(agent_customer_following: true)
      m1 = message(ctx.ru, ctx.u1, "TEST")
      a2_id = ctx.a2.id

      assert [%Data.Badge{agent_id: ^a2_id, following: 1, count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)

      seen(ctx.a2, ctx.ru, m1, false)
      message(ctx.ru, ctx.u1, "TEST @A2", [ctx.a2])

      assert [%Data.Badge{agent_id: ^a2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)
    end

    test "should be 1 on private room", ctx do
      m1 = message(ctx.pa, ctx.a1, "TEST")
      a2_id = ctx.a2.id

      assert [%Data.Badge{agent_id: ^a2_id, following: 1, count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)

      seen(ctx.a2, ctx.pa, m1, false)
      message(ctx.pa, ctx.a1, "TEST @A2", [ctx.a2])

      assert [%Data.Badge{agent_id: ^a2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)
    end

    test "should be 2 on seen", ctx do
      m1 = message(ctx.ra, ctx.a1, "TEST @A2", [ctx.a2])
      seen(ctx.a2, ctx.ra, m1)
      message(ctx.ra, ctx.a1, "TEST 2 @A2", [ctx.a2])
      a2_id = ctx.a2.id

      assert [%Data.Badge{agent_id: ^a2_id, following: 2, mentions_count: 1}] =
               Repo.Badge.load_all(agent_id: a2_id)
    end
  end

  describe "following field for user" do
    test "should be 0 if not following room", ctx do
      message(ctx.ru, ctx.u1, "TEST @U2", [ctx.u2])
      u2_id = ctx.u2.id

      assert [%Data.Badge{user_id: ^u2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(user_id: ctx.u2.id)
    end

    test "should be 0 if unfollowed manually", ctx do
      m1 = message(ctx.ru, ctx.a1, "TEST")
      seen(ctx.u2, ctx.ru, m1, false)
      message(ctx.ru, ctx.a1, "TEST 2 @U2", [ctx.u2])
      u2_id = ctx.u2.id

      assert [%Data.Badge{user_id: ^u2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(user_id: ctx.u2.id)
    end

    test "should be 1 on Triage room with feature option", ctx do
      Repo.FeatureOption.user_defaults(user_triage_following: true)
      triage = triage_room(ctx.h)
      m1 = message(triage, ctx.u1, "TEST")
      u2_id = ctx.u2.id

      assert [%Data.Badge{user_id: ^u2_id, following: 1, count: 1}] =
               Repo.Badge.load_all(user_id: u2_id)

      seen(ctx.u2, triage, m1, false)
      message(triage, ctx.u1, "TEST @U2", [ctx.u2])

      assert [%Data.Badge{user_id: ^u2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(user_id: u2_id)
    end

    test "should be 1 on private room", ctx do
      m1 = message(ctx.pu, ctx.u1, "TEST")
      u2_id = ctx.u2.id

      assert [%Data.Badge{user_id: ^u2_id, following: 1, count: 1}] =
               Repo.Badge.load_all(user_id: u2_id)

      seen(ctx.u2, ctx.pu, m1, false)
      message(ctx.pu, ctx.u1, "TEST @U2", [ctx.u2])

      assert [%Data.Badge{user_id: ^u2_id, following: 0, mentions_count: 1}] =
               Repo.Badge.load_all(user_id: u2_id)
    end

    test "should be 2 on seen", ctx do
      m1 = message(ctx.ru, ctx.a1, "TEST")
      seen(ctx.u2, ctx.ru, m1)
      message(ctx.ru, ctx.u1, "TEST 2 @U2", [ctx.u2])
      u2_id = ctx.u2.id

      assert [%Data.Badge{user_id: ^u2_id, following: 2, mentions_count: 1}] =
               Repo.Badge.load_all(user_id: ctx.u2.id)
    end
  end

  describe "resolving conversation" do
    test "don't hide badges for user", ctx do
      message(ctx.ru, ctx.a1, "TEST")
      seen(ctx.u2, ctx.ru, %{id: "m0"})
      Repo.Room.resolve(ctx.ru.id, true, ctx.a1.id)
      assert [%Data.Badge{count: 1}] = Repo.Badge.load_all(user_id: ctx.u2.id)
    end

    test "hide all badges for agents on resolved conversation", ctx do
      message(ctx.ru, ctx.u1, "TEST @A1", [ctx.a1])

      assert [%Data.Badge{count: 1, mentions_count: 1}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      Repo.Room.resolve(ctx.ru.id, true, ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a1.id)
    end

    test "user message in resolved room makes it unresolved, agent answer resolves it again",
         ctx do
      message(ctx.ru, ctx.u1, "TEST @A1", [ctx.a1])
      Repo.Room.resolve(ctx.ru.id, true, ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      message(ctx.ru, ctx.u1, "TEST 2 @A1", [ctx.a1])

      assert [%Data.Badge{count: 1, mentions_count: 1}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      message(ctx.ru, ctx.a2, "TEST OK", [])

      assert [%Data.Badge{count: 2, mentions_count: 1}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      Repo.Room.resolve(ctx.ru.id, true, ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a1.id)
    end

    test "only assigned agent sees unread badge in unresolved room", ctx do
      t_assignee = tag(ctx.workspace, ":assignee:#{ctx.a1.id}")
      tag(ctx.ru, t_assignee)
      message(ctx.ru, ctx.u1, "TEST @A1", [ctx.a1])

      assert [%Data.Badge{count: 1, mentions_count: 1}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a2.id)

      Repo.Room.resolve(ctx.ru.id, true, ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a2.id)
    end

    test "unassigned agent sees mentions in assigned room", ctx do
      t_assignee = tag(ctx.workspace, ":assignee:#{ctx.a1.id}")
      tag(ctx.ru, t_assignee)
      message(ctx.ru, ctx.u1, "TEST @A2", [ctx.a2])

      assert [%Data.Badge{count: 1, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 1}] = Repo.Badge.load_all(agent_id: ctx.a2.id)

      Repo.Room.resolve(ctx.ru.id, true, ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      assert [%Data.Badge{count: 0, mentions_count: 0}] = Repo.Badge.load_all(agent_id: ctx.a2.id)
    end
  end

  describe "group assignments" do
    test "only agents from assigned group sees unread badge", ctx do
      a3 = agent(ctx.workspace)
      group(ctx.vendor, ctx.a1, "oncall")
      t_group_assignee = tag(ctx.workspace, ":assignee:group:oncall")
      tag(ctx.ru, t_group_assignee)

      t_agent_assignee = tag(ctx.workspace, ":assignee:#{ctx.a2.id}")
      tag(ctx.ru, t_agent_assignee)

      message(ctx.ru, ctx.u1, "TEST")

      assert [%Data.Badge{count: 1}] = Repo.Badge.load_all(agent_id: ctx.a1.id)

      assert [%Data.Badge{count: 1}] = Repo.Badge.load_all(agent_id: ctx.a2.id)

      assert [%Data.Badge{count: 0}] = Repo.Badge.load_all(agent_id: a3.id)
    end
  end
end
