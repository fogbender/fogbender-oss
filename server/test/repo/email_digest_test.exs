defmodule Test.Repo.EmailDigestTest do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  setup do
    v1 = vendor()
    w1 = workspace(v1)
    a1 = agent(w1)
    a2 = agent(w1)
    h1 = helpdesk(w1)
    r1 = public_room(h1)
    r2 = public_room(h1)
    u1 = user(h1)
    u2 = user(h1)

    Repo.FeatureOption.vendor_defaults(
      agent_customer_following: false,
      user_triage_following: false
    )

    Kernel.binding()
  end

  describe "Sending email digest to agent" do
    setup ctx do
      t0 = DateTime.utc_now()
      t1 = DateTime.add(t0, -1000)
      t2 = DateTime.add(t0, 1000)
      Repo.FeatureOption.set(ctx.v1, email_digest_enabled: true)
      Repo.FeatureOption.set(ctx.v1, email_digest_period: 100)
      Kernel.binding()
    end

    test "respect inserted_at if last_activity is nil", ctx do
      update_raw(ctx.a2, inserted_at: ctx.t1)

      assert [ctx.a2.id] ==
               Repo.EmailDigest.agents_to_notify(ctx.t0, 100) |> Enum.map(& &1.agent_id)
    end

    test "respect last_activity", ctx do
      Repo.Agent.update_last_activity(ctx.v1.id, ctx.a2.id, ctx.t2)

      assert [ctx.a1.id] ==
               Repo.EmailDigest.agents_to_notify(ctx.t2, 100) |> Enum.map(& &1.agent_id)
    end

    test "respect last seen updated at", ctx do
      seen(ctx.a2, ctx.r1, %{id: "m0"}) |> update_raw(updated_at: ctx.t2)

      assert [ctx.a1.id] ==
               Repo.EmailDigest.agents_to_notify(ctx.t2, 100) |> Enum.map(& &1.agent_id)
    end

    test "respect last_digest_check", ctx do
      Repo.Agent.update_last_digest_check_at(ctx.v1.id, ctx.a2.id, ctx.t2)

      assert [ctx.a1.id] ==
               Repo.EmailDigest.agents_to_notify(ctx.t2, 100) |> Enum.map(& &1.agent_id)
    end

    test "respect email_digest_enabled feature option", ctx do
      Repo.FeatureOption.set(ctx.v1, email_digest_enabled: false)
      assert [] = Repo.EmailDigest.agents_to_notify(ctx.t0, 100)
    end

    test "respect email_digest_period feature option", ctx do
      Repo.FeatureOption.set(ctx.v1, email_digest_period: 2000)
      assert [] = Repo.EmailDigest.agents_to_notify(ctx.t2, 100)
    end

    test "respect email_digest_template feature option", ctx do
      Repo.FeatureOption.set(ctx.v1, email_digest_template: "new_template")

      assert ["new_template", "new_template"] =
               Repo.EmailDigest.agents_to_notify(ctx.t2, 100)
               |> Enum.map(& &1.email_digest_template)
    end

    test "use current badges with count>0", ctx do
      seen(ctx.a1, ctx.r1, %{id: "m0"})
      seen(ctx.a2, ctx.r2, %{id: "m0"})
      message(ctx.r1, ctx.u1, "TEST 1")
      message(ctx.r2, ctx.u1, "TEST 2")
      message(ctx.r2, ctx.u1, "TEST 3")
      assert ed = [_, _] = Repo.EmailDigest.agents_to_notify(ctx.t2, 100)

      assert [{ctx.a1.id, [{ctx.r1.id, 1}]}, {ctx.a2.id, [{ctx.r2.id, 2}]}] ==
               Repo.EmailDigest.load_agent_badges(ed)
               |> Enum.map(fn digest ->
                 {digest.agent_id, Enum.map(digest.badges, &{&1.room_id, &1.count})}
               end)
    end

    test "don't send emails to bot agents", ctx do
      Data.Agent.update(ctx.a1, is_bot: true) |> Repo.update!()
      assert [] == Repo.EmailDigest.agents_to_notify(ctx.t0, 100)
    end

    test "provide last N unread messages created after last activity", ctx do
      seen(ctx.a1, ctx.r1, %{id: "m0"})
      seen(ctx.a2, ctx.r1, %{id: "m0"})
      Repo.Agent.update_last_activity(ctx.v1.id, ctx.a1.id, DateTime.utc_now())
      for i <- 1..4, do: message(ctx.r1, ctx.u1, "TEST #{i}")
      Repo.Agent.update_last_activity(ctx.v1.id, ctx.a2.id, DateTime.utc_now())
      for i <- 5..6, do: message(ctx.r1, ctx.u1, "TEST #{i}")

      {a1_id, a2_id, r1_id} = {ctx.a1.id, ctx.a2.id, ctx.r1.id}
      assert ed = [_, _] = Repo.EmailDigest.agents_to_notify(ctx.t2, 100)

      assert [
               %Data.EmailDigest{
                 agent_id: ^a1_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 2"},
                         %Data.Message{text: "TEST 3"},
                         %Data.Message{text: "TEST 4"},
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               },
               %Data.EmailDigest{
                 agent_id: ^a2_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               }
             ] = Repo.EmailDigest.load_agent_badges(ed) |> Enum.sort_by(& &1.agent_id)
    end

    test "provide last N uread messages created after previous digest", ctx do
      seen(ctx.a1, ctx.r1, %{id: "m0"})
      seen(ctx.a2, ctx.r1, %{id: "m0"})
      Repo.Agent.update_last_digest_check_at(ctx.v1.id, ctx.a1.id, DateTime.utc_now())
      for i <- 1..4, do: message(ctx.r1, ctx.u1, "TEST #{i}")
      Repo.Agent.update_last_digest_check_at(ctx.v1.id, ctx.a2.id, DateTime.utc_now())
      for i <- 5..6, do: message(ctx.r1, ctx.u1, "TEST #{i}")

      {a1_id, a2_id, r1_id} = {ctx.a1.id, ctx.a2.id, ctx.r1.id}
      assert ed = [_, _] = Repo.EmailDigest.agents_to_notify(ctx.t2, 100)

      assert [
               %Data.EmailDigest{
                 agent_id: ^a1_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 2"},
                         %Data.Message{text: "TEST 3"},
                         %Data.Message{text: "TEST 4"},
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               },
               %Data.EmailDigest{
                 agent_id: ^a2_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               }
             ] = Repo.EmailDigest.load_agent_badges(ed) |> Enum.sort_by(& &1.agent_id)
    end

    test "Forwards have sources with original text", ctx do
      seen(ctx.a1, ctx.r2, %{id: "m0"})
      m = message(ctx.r1, ctx.u1, "ORIGINAL MESSAGE")
      f1 = forward(ctx.r1, ctx.u1, [m])
      f2 = forward(ctx.r2, ctx.u1, [f1])
      assert ed = [_, _] = Repo.EmailDigest.agents_to_notify(ctx.t2, 100)

      assert [{f2.id, "ORIGINAL MESSAGE"}] ==
               (for digest <- Repo.EmailDigest.load_agent_badges(ed),
                    badge <- digest.badges,
                    message <- badge.room.messages,
                    source <- message.sources do
                  {message.id, source.text}
                end)
    end
  end

  describe "Sending email digest to user" do
    setup ctx do
      t0 = DateTime.utc_now()
      t1 = DateTime.add(t0, -1000)
      t2 = DateTime.add(t0, 1000)
      Repo.FeatureOption.set(ctx.v1, email_digest_enabled: true)
      Repo.FeatureOption.set(ctx.v1, email_digest_period: 100)
      Kernel.binding()
    end

    test "respect inserted_at if last_activity is nil", ctx do
      update_raw(ctx.u2, inserted_at: ctx.t1)

      assert [ctx.u2.id] ==
               Repo.EmailDigest.users_to_notify(ctx.t0, 100) |> Enum.map(& &1.user_id)
    end

    test "respect last_activity", ctx do
      Repo.User.update_last_activity(ctx.u2.id, ctx.t2)

      assert [ctx.u1.id] ==
               Repo.EmailDigest.users_to_notify(ctx.t2, 100) |> Enum.map(& &1.user_id)
    end

    test "respect last seen updated at", ctx do
      seen(ctx.u2, ctx.r1, %{id: "m0"}) |> update_raw(updated_at: ctx.t2)

      assert [ctx.u1.id] ==
               Repo.EmailDigest.users_to_notify(ctx.t2, 100) |> Enum.map(& &1.user_id)
    end

    test "respect last_digest_check", ctx do
      Repo.User.update_last_digest_check_at(ctx.u2.id, ctx.t2)

      assert [ctx.u1.id] ==
               Repo.EmailDigest.users_to_notify(ctx.t2, 100) |> Enum.map(& &1.user_id)
    end

    test "respect email_digest_enabled feature option", ctx do
      Repo.FeatureOption.set(ctx.v1, email_digest_enabled: false)
      assert [] = Repo.EmailDigest.users_to_notify(ctx.t0, 100)
    end

    test "respect email_digest_period feature option", ctx do
      Repo.FeatureOption.set(ctx.v1, email_digest_period: 2000)
      assert [] = Repo.EmailDigest.users_to_notify(ctx.t2, 100)
    end

    test "respect email_digest_template feature option", ctx do
      Repo.FeatureOption.set(ctx.v1, email_digest_template: "new_template")

      assert ["new_template", "new_template"] =
               Repo.EmailDigest.users_to_notify(ctx.t2, 100)
               |> Enum.map(& &1.email_digest_template)
    end

    test "use current badges with count>0", ctx do
      seen(ctx.u1, ctx.r1, %{id: "m0"})
      seen(ctx.u2, ctx.r2, %{id: "m0"})
      message(ctx.r1, ctx.a1, "TEST 1")
      message(ctx.r2, ctx.a1, "TEST 2")
      message(ctx.r2, ctx.a1, "TEST 3")
      assert ed = [_, _] = Repo.EmailDigest.users_to_notify(ctx.t2, 100)

      assert [{ctx.u1.id, [{ctx.r1.id, 1}]}, {ctx.u2.id, [{ctx.r2.id, 2}]}] ==
               Repo.EmailDigest.load_user_badges(ed)
               |> Enum.map(fn digest ->
                 {digest.user_id, Enum.map(digest.badges, &{&1.room_id, &1.count})}
               end)
    end

    test "provide last N unread messages created after last activity", ctx do
      seen(ctx.u1, ctx.r1, %{id: "m0"})
      seen(ctx.u2, ctx.r1, %{id: "m0"})
      Repo.User.update_last_activity(ctx.u1.id, DateTime.utc_now())
      for i <- 1..4, do: message(ctx.r1, ctx.a1, "TEST #{i}")
      Repo.User.update_last_activity(ctx.u2.id, DateTime.utc_now())
      for i <- 5..6, do: message(ctx.r1, ctx.a1, "TEST #{i}")

      {u1_id, u2_id, r1_id} = {ctx.u1.id, ctx.u2.id, ctx.r1.id}
      assert ed = [_, _] = Repo.EmailDigest.users_to_notify(ctx.t2, 100)

      assert [
               %Data.EmailDigest{
                 user_id: ^u1_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 2"},
                         %Data.Message{text: "TEST 3"},
                         %Data.Message{text: "TEST 4"},
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               },
               %Data.EmailDigest{
                 user_id: ^u2_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               }
             ] = Repo.EmailDigest.load_user_badges(ed) |> Enum.sort_by(& &1.user_id)
    end

    test "provide last N uread messages created after previous digest", ctx do
      seen(ctx.u1, ctx.r1, %{id: "m0"})
      seen(ctx.u2, ctx.r1, %{id: "m0"})
      Repo.User.update_last_digest_check_at(ctx.u1.id, DateTime.utc_now())
      for i <- 1..4, do: message(ctx.r1, ctx.a1, "TEST #{i}")
      Repo.User.update_last_digest_check_at(ctx.u2.id, DateTime.utc_now())
      for i <- 5..6, do: message(ctx.r1, ctx.a1, "TEST #{i}")

      {u1_id, u2_id, r1_id} = {ctx.u1.id, ctx.u2.id, ctx.r1.id}
      assert ed = [_, _] = Repo.EmailDigest.users_to_notify(ctx.t2, 100)

      assert [
               %Data.EmailDigest{
                 user_id: ^u1_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 2"},
                         %Data.Message{text: "TEST 3"},
                         %Data.Message{text: "TEST 4"},
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               },
               %Data.EmailDigest{
                 user_id: ^u2_id,
                 badges: [
                   %Data.Badge{
                     room: %Data.Room{
                       id: ^r1_id,
                       messages: [
                         %Data.Message{text: "TEST 5"},
                         %Data.Message{text: "TEST 6"}
                       ]
                     }
                   }
                 ]
               }
             ] = Repo.EmailDigest.load_user_badges(ed) |> Enum.sort_by(& &1.user_id)
    end

    test "Forwards have sources with original text", ctx do
      seen(ctx.u1, ctx.r2, %{id: "m0"})
      m = message(ctx.r1, ctx.a1, "ORIGINAL MESSAGE")
      f1 = forward(ctx.r1, ctx.a1, [m])
      f2 = forward(ctx.r2, ctx.a1, [f1])
      assert ed = Repo.EmailDigest.users_to_notify(ctx.t2, 100)

      assert [{f2.id, "ORIGINAL MESSAGE"}] ==
               (for digest <- Repo.EmailDigest.load_user_badges(ed),
                    badge <- digest.badges,
                    message <- badge.room.messages,
                    source <- message.sources do
                  {message.id, source.text}
                end)
    end
  end
end
