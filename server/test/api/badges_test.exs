defmodule Test.Api.BadgesTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.{Data, Repo, Api, Utils}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)

    agent_api =
      Api.Session.for_agent(vendor.id, agent.id)
      |> Api.init()

    ha = helpdesk(workspace, true)
    h1 = helpdesk(workspace)

    [user, u12, u13] = users(3, h1)

    user_api =
      Api.Session.for_user(vendor.id, h1.id, user.id)
      |> Api.init()

    [a1, a2, a3] = agents(3, workspace)

    agent_room = public_room(ha)
    user_room = public_room(h1)

    user_topic = badges_topic(user_api)
    agent_topic = badges_topic(agent_api)

    messages = send_messages(user_api, user_room, 10)

    Repo.FeatureOption.vendor_defaults(
      agent_customer_following: false,
      user_triage_following: false
    )

    Kernel.binding()
  end

  describe "load badges for agent" do
    test "don't show rooms without seen", ctx do
      assert [] = load_badges(ctx.agent_api)
    end

    test "firstUnreadMessage value is next not seen message", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[1])

      assert(
        [
          %Api.Event.Badge{
            count: 9,
            firstUnreadMessage: %{rawText: "TEST 2"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "show badge for room with no unread messages", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[10])

      {vid, wid, cid, rid} =
        {ctx.vendor.id, ctx.workspace.id, ctx.h1.customer_id, ctx.user_room.id}

      assert(
        [
          %Api.Event.Badge{
            vendorId: ^vid,
            workspaceId: ^wid,
            customerId: ^cid,
            roomId: ^rid,
            roomType: "public",
            count: 0,
            firstUnreadMessage: nil,
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "show badge for dialog room without seen", ctx do
      dialog = dialog_room(ctx.h1, [ctx.user, ctx.agent])
      dialog_id = dialog.id
      send_messages(ctx.user_api, dialog, 10)

      assert(
        [
          %Api.Event.Badge{
            roomId: ^dialog_id,
            roomType: "dialog",
            count: 10,
            firstUnreadMessage: %{rawText: "TEST 1"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "show badge for private room without seen", ctx do
      private = private_room(ctx.h1, [ctx.user, ctx.agent])
      private_id = private.id
      send_messages(ctx.user_api, private, 10)

      assert(
        [
          %Api.Event.Badge{
            roomId: ^private_id,
            roomType: "private",
            count: 10,
            firstUnreadMessage: %{rawText: "TEST 1"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "don't show badge for private room without message", ctx do
      private_room(ctx.h1, [ctx.user, ctx.agent])
      assert [] = load_badges(ctx.agent_api)
    end

    test "updatedTs is the last seen or room message", ctx do
      agent_seen = seen(ctx.agent, ctx.user_room, ctx.messages[10])
      seen_inserted_at = agent_seen.inserted_at |> Utils.to_unix()

      assert(
        [
          %Api.Event.Badge{
            count: 0,
            firstUnreadMessage: nil,
            lastRoomMessage: %{rawText: "TEST 10"},
            updatedTs: ^seen_inserted_at
          }
        ] = load_badges(ctx.agent_api)
      )

      new = send_message(ctx.user_api, ctx.user_room, "NEW")
      new_inserted_at = new.inserted_at |> Utils.to_unix()

      assert(
        [
          %Api.Event.Badge{
            count: 1,
            firstUnreadMessage: %{rawText: "NEW"},
            lastRoomMessage: %{rawText: "NEW"},
            updatedTs: ^new_inserted_at
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "encode to json", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[1])
      badges = load_badges(ctx.agent_api)

      assert(
        {:ok,
         [
           %Api.Event.Badge{
             firstUnreadMessage: %Api.Event.Message{msgType: "Event.Message"},
             lastRoomMessage: %Api.Event.Message{msgType: "Event.Message"}
           }
         ]} =
          badges
          |> Api.Encoder.Json.encode()
          |> Api.Encoder.Json.decode()
      )
    end

    test "do not duplicate messages if agent belongs to several vendors", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[1])
      vendor([ctx.agent])
      assert %{groups: [_, _]} = ctx.agent |> Repo.preload(:groups, force: true)

      assert(
        [
          %Api.Event.Badge{
            count: 9,
            firstUnreadMessage: %{rawText: "TEST 2"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "do not duplicate messages if agent belongs to several groups", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[1])
      group(ctx.vendor, ctx.agent, "new_group")
      assert %{groups: [_, _]} = ctx.agent |> Repo.preload(:groups, force: true)

      assert(
        [
          %Api.Event.Badge{
            count: 9,
            firstUnreadMessage: %{rawText: "TEST 2"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "use agent groups from room's vendor", ctx do
      p1 = private_room(ctx.h1, [ctx.user])
      room_group(p1, "design")
      send_messages(ctx.user_api, p1, 10)

      p2 = private_room(ctx.h1, [ctx.user])
      room_group(p2, "devops")
      send_messages(ctx.user_api, p2, 10)
      p2_id = p2.id
      group(ctx.vendor, ctx.agent, "devops")

      v2 = vendor([ctx.agent])
      group(v2, ctx.agent, "design")

      assert(
        [
          %Api.Event.Badge{
            roomId: ^p2_id,
            count: 10
          }
        ] = load_badges(ctx.agent_api)
      )
    end
  end

  describe "load badges for user" do
    test "public room", ctx do
      assert(
        [
          %Api.Event.Badge{
            count: 0,
            firstUnreadMessage: nil,
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.user_api)
      )

      new = send_message(ctx.agent_api, ctx.user_room, "NEW")
      new_inserted_at = new.inserted_at |> Utils.to_unix()

      assert(
        [
          %Api.Event.Badge{
            count: 1,
            firstUnreadMessage: %{rawText: "NEW"},
            lastRoomMessage: %{rawText: "NEW"},
            updatedTs: ^new_inserted_at
          }
        ] = load_badges(ctx.user_api)
      )
    end

    test "respect scoped tags flag", ctx do
      scoping_f = flag("User Tag Scoping")
      flag(ctx.workspace, scoping_f)
      tag1 = tag(ctx.workspace, "#tag1")
      tagged_room = public_room(ctx.h1)
      tagged_room_id = tagged_room.id
      tag(tagged_room, [tag1])
      tag(ctx.user, [tag1])

      tag2 = tag(ctx.workspace, "#tag2")
      tag(ctx.user_room, [tag2])
      send_message(ctx.agent_api, ctx.user_room, "NEW TAG2")

      m = send_message(ctx.agent_api, tagged_room, "NEW TAG1 1")
      send_message(ctx.agent_api, tagged_room, "NEW TAG1 2")
      send_message(ctx.agent_api, tagged_room, "NEW TAG1 3")
      seen(ctx.user, tagged_room, m)

      assert(
        [
          %Api.Event.Badge{
            roomId: ^tagged_room_id,
            count: 2,
            firstUnreadMessage: %{rawText: "NEW TAG1 2"},
            lastRoomMessage: %{rawText: "NEW TAG1 3"}
          }
        ] = load_badges(ctx.user_api)
      )
    end

    test "show message for public room without tags", ctx do
      open_tag = Repo.Tag.create(ctx.workspace.id, ":status:open")
      untag(ctx.user_room, open_tag)

      scoping_f = flag("User Tag Scoping")
      flag(ctx.workspace, scoping_f)
      user_room_id = ctx.user_room.id

      assert(
        [
          %Api.Event.Badge{
            roomId: ^user_room_id,
            count: 0,
            firstUnreadMessage: nil,
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.user_api)
      )
    end
  end

  describe "badges on special events" do
    test "badges on new room message", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[10])
      apid = sub(ctx.agent_topic)
      send_message(ctx.user_api, ctx.user_room, "NEW")
      room_id = ctx.user_room.id
      assert_receive {^apid, _, %Api.Event.Badge{roomId: ^room_id}}
    end

    test "badges on room message update", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[9])

      apid = sub(ctx.agent_topic)

      msg = %Api.Message.Update{
        messageId: ctx.messages[10].id,
        text: "UPDATED"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert_receive(
        {^apid, _,
         %Api.Event.Badge{
           lastRoomMessage: %{text: "<p>UPDATED</p>"},
           firstUnreadMessage: %{text: "<p>UPDATED</p>"}
         }},
        5000
      )
    end

    test "badges on room message virtual delete", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[9])
      apid = sub(ctx.agent_topic)

      msg = %Api.Message.Update{
        messageId: ctx.messages[10].id
      }

      text = "Deleted by #{ctx.user.name}"

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert_receive(
        {^apid, _,
         %Api.Event.Badge{
           lastRoomMessage: %_{text: ^text},
           firstUnreadMessage: %_{text: ^text}
         }},
        5000
      )
    end

    test "badges on seen message", ctx do
      apid = sub(ctx.agent_topic)
      send_seen(ctx.agent_api, ctx.user_room, ctx.messages[10])
      room_id = ctx.user_room.id
      assert_receive {^apid, _, %Api.Event.Badge{roomId: ^room_id}}
    end
  end

  describe "badges with mention" do
    test "show mentions count with next mention message", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[10])
      send_message(ctx.user_api, ctx.user_room, "NEW 1")
      send_message(ctx.user_api, ctx.user_room, "MENTION 1 @Agent 1", [{ctx.agent.id, "Agent 1"}])
      send_message(ctx.user_api, ctx.user_room, "MENTION 2 @Agent 1", [{ctx.agent.id, "Agent 1"}])
      send_message(ctx.user_api, ctx.user_room, "NEW 2")

      assert(
        [
          %Api.Event.Badge{
            count: 4,
            mentionsCount: 2,
            firstUnreadMessage: %{rawText: "NEW 1"},
            lastRoomMessage: %{rawText: "NEW 2"},
            nextMentionMessage: %{rawText: "MENTION 1 @Agent 1"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "show for room without seen", ctx do
      send_message(ctx.user_api, ctx.user_room, "MENTION 1 @Agent 1", [{ctx.agent.id, "Agent 1"}])

      assert(
        [
          %Api.Event.Badge{
            count: 11,
            mentionsCount: 1,
            firstUnreadMessage: %{rawText: "TEST 1"},
            lastRoomMessage: %{rawText: "MENTION 1 @Agent 1"},
            nextMentionMessage: %{rawText: "MENTION 1 @Agent 1"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end
  end

  describe "badges stream pagination" do
    setup ctx do
      rooms =
        for i <- 1..10 do
          r = public_room(ctx.h1, "ROOM #{i}")
          m1 = message(r, ctx.agent, "MESSAGE R#{i} 1")
          m2 = message(r, ctx.agent, "MESSAGE R#{i} 2")

          seen =
            case rem(i, 2) do
              0 -> seen(ctx.user, r, m1)
              1 -> seen(ctx.user, r, m2)
            end

          Process.sleep(2)
          ["r#{i}": r, "m#{i}1": m1, "m#{i}2": m2, "seen#{i}": seen]
        end

      List.flatten(rooms)
    end

    test "Sub with :since", ctx do
      since = ctx.seen8.inserted_at |> Fog.Utils.to_unix()
      msg = %Api.Stream.Sub{topic: ctx.user_topic, since: since}

      assert {:reply, %Api.Stream.SubOk{items: badges, tooManyUpdates: false}, _} =
               Api.request(msg, ctx.user_api)

      assert 2 == length(badges)
      assert [ctx.r9.id, ctx.r10.id] == for(b <- badges, do: b.roomId)
    end

    test "Sub with no updates", ctx do
      since = (ctx.seen10.inserted_at |> Fog.Utils.to_unix()) + 1
      msg = %Api.Stream.Sub{topic: ctx.user_topic, since: since}

      assert {:reply, %Api.Stream.SubOk{items: badges, tooManyUpdates: false}, _} =
               Api.request(msg, ctx.user_api)

      assert 0 == length(badges)
    end

    test "Sub with too many updates", ctx do
      since = 0
      msg = %Api.Stream.Sub{topic: ctx.user_topic, since: since}

      assert {:reply, %Api.Stream.SubOk{items: badges, tooManyUpdates: true}, _} =
               Api.request(msg, ctx.user_api)

      assert 0 == length(badges)
    end

    test "Sub without :since", ctx do
      msg = %Api.Stream.Sub{topic: ctx.user_topic}

      assert {:reply, %Api.Stream.SubOk{items: badges, tooManyUpdates: false}, _} =
               Api.request(msg, ctx.user_api)

      assert 0 == length(badges)
    end

    test "next/prev field in Get result", ctx do
      msg = %Api.Stream.Get{topic: ctx.user_topic, limit: 5}

      assert {:reply, %Api.Stream.GetOk{items: badges, prev: prev}, _} =
               Api.request(msg, ctx.user_api)

      assert [ctx.r10.id, ctx.r9.id, ctx.r8.id, ctx.r7.id, ctx.r6.id] ==
               for(b <- badges, do: b.roomId)

      msg = %Api.Stream.Get{topic: ctx.user_topic, limit: 2, prev: prev}

      assert {:reply, %Api.Stream.GetOk{items: badges, next: next}, _} =
               Api.request(msg, ctx.user_api)

      assert [ctx.r5.id, ctx.r4.id] == for(b <- badges, do: b.roomId)

      msg = %Api.Stream.Get{topic: ctx.user_topic, limit: 3, next: next}

      assert {:reply, %Api.Stream.GetOk{items: badges}, _} = Api.request(msg, ctx.user_api)

      assert [ctx.r6.id, ctx.r7.id, ctx.r8.id] == for(b <- badges, do: b.roomId)
    end

    test "pagination with several badges at the same timestamp", ctx do
      ts = DateTime.utc_now()

      Repo.update_all(
        Data.Seen,
        set: [inserted_at: ts]
      )

      ts = Utils.to_unix(ts)
      msg = %Api.Stream.Get{topic: ctx.user_topic, limit: 2}

      assert {:reply, %Api.Stream.GetOk{items: badges, prev: prev}, _} =
               Api.request(msg, ctx.user_api)

      assert [{ts, ctx.r10.id}, {ts, ctx.r9.id}] == for(b <- badges, do: {b.updatedTs, b.roomId})

      msg = %Api.Stream.Get{topic: ctx.user_topic, limit: 2, prev: prev}

      assert {:reply, %Api.Stream.GetOk{items: badges, next: next}, _} =
               Api.request(msg, ctx.user_api)

      assert [{ts, ctx.r8.id}, {ts, ctx.r7.id}] == for(b <- badges, do: {b.updatedTs, b.roomId})

      msg = %Api.Stream.Get{topic: ctx.user_topic, limit: 10, next: next}

      assert {:reply, %Api.Stream.GetOk{items: badges}, _} = Api.request(msg, ctx.user_api)

      assert [{ts, ctx.r9.id}, {ts, ctx.r10.id}] == for(b <- badges, do: {b.updatedTs, b.roomId})
    end
  end

  describe "badges with agent_customer_following feature option enabled" do
    setup do
      Repo.FeatureOption.vendor_defaults(agent_customer_following: true)
    end

    test "agent should see new messages in all public customer's rooms", ctx do
      assert(
        [
          %Api.Event.Badge{
            count: 10,
            firstUnreadMessage: %{rawText: "TEST 1"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "agent still doesn't see counters from private rooms without access", ctx do
      private = private_room(ctx.h1, [ctx.user])
      send_messages(ctx.user_api, private, 10)

      assert(
        [
          %Api.Event.Badge{
            count: 10,
            firstUnreadMessage: %{rawText: "TEST 1"},
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.agent_api)
      )
    end

    test "count only messages created after agent creation", ctx do
      new_agent = agent(ctx.workspace)

      new_agent_api =
        Api.Session.for_agent(ctx.vendor.id, new_agent.id)
        |> Api.init()

      assert(
        [
          %Api.Event.Badge{
            count: 0,
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(new_agent_api)
      )

      send_message(ctx.agent_api, ctx.user_room, "NEW MESSAGE")

      assert(
        [
          %Api.Event.Badge{
            count: 1,
            lastRoomMessage: %{rawText: "NEW MESSAGE"}
          }
        ] = load_badges(new_agent_api)
      )
    end
  end

  describe "badges with user_triage_following feature option enabled" do
    setup ctx do
      Repo.FeatureOption.vendor_defaults(user_triage_following: true)
      triage = triage_room(ctx.h1, "Triage")
      send_message(ctx.agent_api, triage, "Welcome!")
      room2 = public_room(ctx.h1, "ROOM2")
      send_message(ctx.agent_api, room2, "HELLO!")
      [triage: triage]
    end

    test "new user should see new messages in triage", ctx do
      r1_id = ctx.user_room.id
      triage_id = ctx.triage.id

      assert(
        [
          %Api.Event.Badge{
            roomId: ^triage_id,
            count: 1,
            firstUnreadMessage: %{rawText: "Welcome!"},
            lastRoomMessage: %{rawText: "Welcome!"}
          },
          %Api.Event.Badge{
            roomId: ^r1_id,
            count: 0,
            lastRoomMessage: %{rawText: "TEST 10"}
          }
        ] = load_badges(ctx.user_api)
      )
    end

    test "count only messages created after agent creation", ctx do
      new_user = user(ctx.h1)

      new_user_api =
        Api.Session.for_user(ctx.vendor.id, ctx.h1.id, new_user.id)
        |> Api.init()

      assert(
        [
          %Api.Event.Badge{
            count: 0,
            lastRoomMessage: %{rawText: "Welcome!"}
          }
        ] = load_badges(new_user_api)
      )

      send_message(ctx.agent_api, ctx.triage, "NEW MESSAGE")

      assert(
        [
          %Api.Event.Badge{
            count: 1,
            lastRoomMessage: %{rawText: "NEW MESSAGE"}
          }
        ] = load_badges(new_user_api)
      )
    end
  end

  describe "badges after unfollow" do
    test "not count old messages", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[1])
      send_unseen(ctx.agent_api, ctx.user_room)

      assert([] = load_badges(ctx.agent_api))
    end

    test "not count new messages", ctx do
      seen(ctx.agent, ctx.user_room, ctx.messages[1])
      send_unseen(ctx.agent_api, ctx.user_room)
      send_message(ctx.user_api, ctx.user_room, "NEW")

      assert([] = load_badges(ctx.agent_api))
    end

    test "not count old mentions", ctx do
      m =
        send_message(ctx.user_api, ctx.user_room, "MENTION 1 @Agent 1", [
          {ctx.agent.id, "Agent 1"}
        ])

      seen(ctx.agent, ctx.user_room, m)
      send_unseen(ctx.agent_api, ctx.user_room)

      assert([] = load_badges(ctx.agent_api))
    end

    test "count new mentions", ctx do
      send_unseen(ctx.agent_api, ctx.user_room)
      send_message(ctx.user_api, ctx.user_room, "MENTION 1 @Agent 1", [{ctx.agent.id, "Agent 1"}])

      assert(
        [
          %Api.Event.Badge{
            mentionsCount: 1
          }
        ] = load_badges(ctx.agent_api)
      )
    end
  end

  defp send_message(api, room, text, mentions \\ []) do
    msg = %Api.Message.Create{
      roomId: room.id,
      text: text,
      clientId: "test-id",
      mentions:
        mentions |> Enum.map(fn {id, text} -> %Api.Message.Mention{id: id, text: text} end)
    }

    assert {:reply, %Api.Message.Ok{messageId: message_id}, _} = Api.request(msg, api)
    Repo.get(Data.Message, message_id)
  end

  defp send_seen(api, room, message) do
    msg = %Api.Message.Seen{
      roomId: room.id,
      messageId: message.id
    }

    message_id = message.id
    assert {:reply, %Api.Message.Ok{messageId: ^message_id}, _} = Api.request(msg, api)
    :ok
  end

  defp send_unseen(api, room) do
    msg = %Api.Message.Unseen{
      roomId: room.id
    }

    assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, api)
    :ok
  end

  defp send_messages(api, room, count) do
    for(i <- 1..count, do: {i, send_message(api, room, "TEST #{i}")}) |> Map.new()
  end

  defp load_badges(api) do
    msg = %Api.Stream.Get{topic: badges_topic(api)}
    assert {:reply, %Api.Stream.GetOk{items: items}, _} = Api.request(msg, api)
    items
  end

  defp badges_topic(%Api{session: %Api.Session.Agent{agentId: agent_id}}),
    do: "agent/#{agent_id}/badges"

  defp badges_topic(%Api{session: %Api.Session.User{userId: user_id}}),
    do: "user/#{user_id}/badges"
end
