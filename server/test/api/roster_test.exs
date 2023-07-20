defmodule Test.Api.RosterTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  alias Fog.{Api, ApiProcess, Api.Event}
  alias Event.{RosterSection, RosterRoom}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)
    agent_api = ApiProcess.start(agent)

    agent2 = agent(workspace)
    agent2_api = ApiProcess.start(agent2)

    helpdesk = helpdesk(workspace)
    user = user(helpdesk)
    user_api = ApiProcess.start(user)

    Kernel.binding()
  end

  describe "for agent" do
    setup :setup_agent_env

    test "subscription", ctx do
      request = %Api.Roster.Sub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      dialog_name = ctx.ra_dialog.name
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert %{
               "ARCHIVED ROOM" => %{"ARCHIVED" => 1},
               "ASSIGNED ROOM" => %{"ASSIGNED" => 1},
               "ASSIGNED TO ME ROOM" => %{"ASSIGNED TO ME" => 1},
               "PINNED ROOM" => %{"PINNED" => 1, "OPEN" => 2},
               "PRIVATE ROOM" => %{"OPEN" => 3},
               "PUBLIC ROOM" => %{"OPEN" => 1},
               ^dialog_name => %{"DIRECT" => 1}
             } = filter_rooms(items)

      assert [
               %Event.RosterSection{name: "ARCHIVED", count: 1, unreadCount: 1, mentionsCount: 0},
               %Event.RosterSection{name: "ASSIGNED", count: 1, unreadCount: 0, mentionsCount: 0},
               %Event.RosterSection{
                 name: "ASSIGNED TO ME",
                 count: 1,
                 unreadCount: 1,
                 mentionsCount: 0
               },
               %Event.RosterSection{name: "DIRECT", count: 1, unreadCount: 1, mentionsCount: 1},
               %Event.RosterSection{name: "OPEN", count: 3, unreadCount: 2, mentionsCount: 0},
               %Event.RosterSection{name: "PINNED", count: 1, unreadCount: 1, mentionsCount: 0}
             ] = filter_sections(items)
    end

    test "unsub", ctx do
      request = %Api.Roster.Sub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Roster.UnSub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      assert %Api.Roster.UnSubOk{} = ApiProcess.request(ctx.agent_api, request)
    end

    test "range loading", ctx do
      for i <- 1..10 do
        r = public_room(ctx.ha, "R#{i}")
        m = message(r, ctx.agent2, "M1")
        seen(ctx.agent, r, m)
      end

      request = %Api.Roster.Sub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Roster.GetRange{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "main",
        sectionId: "OPEN",
        startPos: 1,
        limit: 5
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               {"PUBLIC ROOM", %{"OPEN" => 1}},
               {"PINNED ROOM", %{"OPEN" => 2, "PINNED" => 1}},
               {"R10", %{"OPEN" => 3}},
               {"R9", %{"OPEN" => 4}},
               {"R8", %{"OPEN" => 5}}
             ] = items |> Enum.map(&{&1.room.name, &1.sections})

      request = %Api.Roster.GetRange{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "main",
        sectionId: "OPEN",
        startPos: 6,
        limit: 10
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               {"R7", %{"OPEN" => 6}},
               {"R6", %{"OPEN" => 7}},
               {"R5", %{"OPEN" => 8}},
               {"R4", %{"OPEN" => 9}},
               {"R3", %{"OPEN" => 10}},
               {"R2", %{"OPEN" => 11}},
               {"R1", %{"OPEN" => 12}},
               {"PRIVATE ROOM", %{"OPEN" => 13}}
             ] = items |> Enum.map(&{&1.room.name, &1.sections})
    end

    test "rooms loading", ctx do
      request = %Api.Roster.Sub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Roster.GetRooms{
        topic: "workspace/#{ctx.workspace.id}/roster",
        roomIds: [ctx.ra_public.id, ctx.ra_assigned.id, ctx.ra_private.id]
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               {"ASSIGNED ROOM", %{"ASSIGNED" => 1}},
               {"PRIVATE ROOM", %{"OPEN" => 3}},
               {"PUBLIC ROOM", %{"OPEN" => 1}}
             ] = items |> Enum.map(&{&1.room.name, &1.sections}) |> Enum.sort()
    end

    test "updating room tags update counters", ctx do
      request = %Api.Roster.Sub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert %{
               "PUBLIC ROOM" => %{"OPEN" => 1}
             } = filter_rooms(items, ["PUBLIC ROOM"])

      assert [
               %Event.RosterSection{
                 name: "ASSIGNED TO ME",
                 count: 1,
                 unreadCount: 1,
                 mentionsCount: 0
               },
               %Event.RosterSection{name: "OPEN", count: 3, unreadCount: 2, mentionsCount: 0}
             ] = filter_sections(items, ["OPEN", "ASSIGNED TO ME"])

      request = %Api.Room.Update{roomId: ctx.ra_public.id, tagsToAdd: [ctx.t_assigned_me.name]}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %RosterRoom{
                 room: %Event.Room{name: "PUBLIC ROOM"},
                 sections: %{"ASSIGNED TO ME" => 1}
               },
               %Event.RosterSection{name: "ASSIGNED TO ME", count: 2, unreadCount: 2},
               %Event.RosterSection{name: "OPEN", count: 2, unreadCount: 1}
             ] = roster_flush(ctx.agent_api)
    end

    test "changing room name doesn't updates sections", ctx do
      request = %Api.Roster.Sub{
        topic: "workspace/#{ctx.workspace.id}/roster"
      }

      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert %{
               "PUBLIC ROOM" => %{"OPEN" => 1}
             } = filter_rooms(items, ["PUBLIC ROOM"])

      assert [
               %Event.RosterSection{name: "OPEN", count: 3, unreadCount: 2, mentionsCount: 0}
             ] = filter_sections(items, ["OPEN"])

      request = %Api.Room.Update{roomId: ctx.ra_public.id, name: "NEW NAME"}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "NEW NAME", id: public_room_id},
                 sections: %{"OPEN" => 1},
                 view: "main"
               }
             ] = roster_flush(ctx.agent_api)

      assert public_room_id == ctx.ra_public.id
    end

    test "removing room access updates sections", ctx do
      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert %{
               "PRIVATE ROOM" => %{"OPEN" => 3}
             } = filter_rooms(items, ["PRIVATE ROOM"])

      assert [
               %Event.RosterSection{name: "OPEN", count: 3, unreadCount: 2, mentionsCount: 0}
             ] = filter_sections(items, ["OPEN"])

      request = %Api.Room.Update{
        roomId: ctx.ra_private.id,
        membersToRemove: [ctx.agent.id],
        membersToAdd: []
      }

      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: nil, id: private_room_id, remove: true},
                 badge: nil,
                 sections: %{}
               },
               %Event.RosterSection{name: "OPEN", count: 2, unreadCount: 2, mentionsCount: 0}
             ] = roster_flush(ctx.agent_api)

      assert private_room_id == ctx.ra_private.id
    end

    test "badge update", ctx do
      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert %{
               "PRIVATE ROOM" => %{"OPEN" => 3}
             } = filter_rooms(items, ["PRIVATE ROOM"])

      assert [
               %RosterSection{name: "OPEN", count: 3, unreadCount: 2, mentionsCount: 0}
             ] = filter_sections(items, ["OPEN"])

      request = %Api.Message.Create{
        roomId: ctx.ra_private.id,
        text: "TEST @AGENT 1",
        mentions: [%Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"}]
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "PRIVATE ROOM"},
                 badge: %Event.Badge{count: 1},
                 sections: %{"OPEN" => 1}
               },
               %Event.RosterSection{
                 name: "OPEN",
                 count: 3,
                 unreadCount: 3,
                 mentionsCount: 1
               }
             ] = roster_flush(ctx.agent_api)
    end

    test "ignore rooms events from another workspace", ctx do
      w2 = workspace(ctx.vendor)
      h2 = helpdesk(w2)
      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Stream.Sub{topic: "workspace/#{w2.id}/rooms"}
      assert %Api.Stream.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Room.Create{
        helpdeskId: h2.id,
        name: "ROOM 2",
        type: "public"
      }

      assert %Api.Room.Ok{roomId: rid} = ApiProcess.request(ctx.agent_api, request)
      items = ApiProcess.flush(ctx.agent_api)
      assert [%Event.Room{name: "ROOM 2"}] = items

      request = %Api.Message.Create{
        roomId: rid,
        text: "TEXT 2"
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)
      items = ApiProcess.flush(ctx.agent_api)
      assert [%Event.Badge{roomId: ^rid}, %Event.Room{name: "ROOM 2"}] = items
    end
  end

  describe "views" do
    setup :setup_agent_env

    setup ctx do
      topic = "workspace/#{ctx.workspace.id}/roster"

      request = %Api.Roster.Sub{topic: topic}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)
      [topic: topic]
    end

    test "open view", ctx do
      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "test",
        sections: ["PINNED", "DIRECT", "PRIVATE"]
      }

      assert %Api.Roster.OpenViewOk{view: "test", items: items} =
               ApiProcess.request(ctx.agent_api, request)

      assert [
               {"test", ctx.ra_dialog.name, %{"DIRECT" => 1}},
               {"test", "PINNED ROOM", %{"PINNED" => 1}},
               {"test", "PRIVATE ROOM", %{"PRIVATE" => 1}}
             ]
             |> Enum.sort() ==
               (for %Event.RosterRoom{} = r <- items do
                  {r.view, r.room.name, r.sections}
                end)
               |> Enum.sort()

      assert [
               %Fog.Api.Event.RosterSection{
                 view: "test",
                 name: "DIRECT",
                 count: 1,
                 unreadCount: 1,
                 mentionsCount: 1
               },
               %Fog.Api.Event.RosterSection{
                 view: "test",
                 name: "PINNED",
                 count: 1,
                 unreadCount: 1,
                 mentionsCount: 0
               },
               %Fog.Api.Event.RosterSection{
                 view: "test",
                 name: "PRIVATE",
                 count: 1,
                 unreadCount: 0,
                 mentionsCount: 0
               }
             ] = filter_sections(items)
    end

    test "changing room updates all active views", ctx do
      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "test",
        sections: ["PINNED", "DIRECT", "PRIVATE"]
      }

      assert %Api.Roster.OpenViewOk{view: "test"} = ApiProcess.request(ctx.agent_api, request)

      assert [] = roster_flush(ctx.agent_api)

      request = %Api.Message.Create{
        roomId: ctx.ra_private.id,
        text: "TEST @AGENT 1",
        mentions: [%Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"}]
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      assert [
               %Fog.Api.Event.RosterRoom{
                 view: "main",
                 room: %Event.Room{name: "PRIVATE ROOM"},
                 badge: %Event.Badge{count: 1, mentionsCount: 1},
                 sections: %{"OPEN" => 1}
               },
               %Fog.Api.Event.RosterSection{
                 view: "main",
                 name: "OPEN",
                 count: 3,
                 unreadCount: 3,
                 mentionsCount: 1,
                 unresolvedCount: 0
               },
               %Fog.Api.Event.RosterRoom{
                 view: "test",
                 room: %Event.Room{name: "PRIVATE ROOM"},
                 badge: %Event.Badge{count: 1, mentionsCount: 1},
                 sections: %{"PRIVATE" => 1}
               },
               %Fog.Api.Event.RosterSection{
                 view: "test",
                 name: "PRIVATE",
                 count: 1,
                 unreadCount: 1,
                 mentionsCount: 1
               }
             ] = roster_flush(ctx.agent_api)
    end

    test "closing view stops sending updates for it", ctx do
      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "test",
        sections: ["PINNED", "DIRECT", "PRIVATE"]
      }

      assert %Api.Roster.OpenViewOk{view: "test"} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Roster.CloseView{
        topic: ctx.topic,
        view: "test"
      }

      assert %Api.Roster.CloseViewOk{view: "test"} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Message.Create{
        roomId: ctx.ra_private.id,
        text: "TEST @AGENT 1",
        mentions: [%Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"}]
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      assert [
               %Fog.Api.Event.RosterRoom{view: "main"},
               %Fog.Api.Event.RosterSection{view: "main"}
             ] = roster_flush(ctx.agent_api)
    end

    test "customerIds filter", ctx do
      h1 = customer_helpdesk(ctx.workspace, "C1")
      h2 = customer_helpdesk(ctx.workspace, "C2")

      assert %Api.Room.Ok{} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h1.id,
                 name: "H1 R1",
                 type: "public"
               })

      roster_flush(ctx.agent_api)

      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "filtered",
        sections: ["?ALL", "PRIVATE"],
        filters: %{"customerIds" => [h1.customer_id, h2.customer_id]}
      }

      assert %Api.Roster.OpenViewOk{view: "filtered", items: items} =
               ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{
                 view: "filtered",
                 room: %{name: "H1 R1"},
                 sections: %{"ALL" => 1}
               },
               %Event.RosterSection{view: "filtered", name: "ALL", count: 1}
             ] = items |> view_events_sort()

      assert %Api.Room.Ok{} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h2.id,
                 name: "H2 R1",
                 type: "private",
                 members: [ctx.agent.id]
               })

      assert [
               %Event.RosterRoom{
                 view: "filtered",
                 room: %{name: "H2 R1"},
                 sections: %{"PRIVATE" => 1, "ALL" => 2}
               },
               %Event.RosterSection{view: "filtered", name: "ALL", count: 2},
               %Event.RosterSection{view: "filtered", name: "PRIVATE", count: 1},
               %Event.RosterRoom{
                 view: "main",
                 room: %{name: "H2 R1"},
                 sections: %{"ASSIGNED TO ME" => 2}
               },
               %Event.RosterSection{view: "main", name: "ASSIGNED TO ME"}
             ] = roster_flush(ctx.agent_api)
    end

    test "focused filter", ctx do
      assert %Api.Roster.CloseViewOk{} =
               ApiProcess.request(ctx.agent_api, %Api.Roster.CloseView{
                 topic: ctx.topic,
                 view: "main"
               })

      h1 = customer_helpdesk(ctx.workspace, "C1")

      assert %Api.Room.Ok{roomId: room_id} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h1.id,
                 name: "H1 R1",
                 type: "public"
               })

      roster_flush(ctx.agent_api)

      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "focused",
        sections: ["ALL"],
        filters: %{"focused" => true, "customerIds" => [h1.customer_id]}
      }

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{
                 sections: %{"ALL" => 1},
                 room: %{name: "H1 R1", resolved: false}
               },
               %Fog.Api.Event.RosterSection{name: "ALL", count: 1, unresolvedCount: 1}
             ] = items |> view_events_sort()

      request = %Api.Room.Resolve{roomId: room_id}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)
      empty_map = %{}

      assert [
               %Event.RosterRoom{sections: ^empty_map, room: %{name: "H1 R1", resolved: true}},
               %Fog.Api.Event.RosterSection{name: "ALL", count: 0, unresolvedCount: 0}
             ] = roster_flush(ctx.agent_api) |> view_events_sort()
    end

    test "PINNED section ignores filters", ctx do
      h1 = customer_helpdesk(ctx.workspace, "C1")

      assert %Api.Room.Ok{roomId: room_id} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h1.id,
                 name: "H1 Resolved",
                 type: "public"
               })

      request = %Api.Room.Resolve{roomId: room_id}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Room.Update{roomId: room_id, tagsToAdd: [ctx.t_pin.name]}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "test",
        sections: ["?PINNED", "ALL"],
        filters: %{"focused" => true, "customerIds" => [h1.customer_id]}
      }

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Fog.Api.Event.RosterRoom{room: %{name: "H1 Resolved"}},
               %Fog.Api.Event.RosterRoom{room: %{name: "PINNED ROOM"}},
               %Fog.Api.Event.RosterSection{
                 name: "PINNED",
                 id: "PINNED",
                 count: 2,
                 unreadCount: 1,
                 mentionsCount: 0,
                 unresolvedCount: 0
               }
             ] = view_events_sort(items)
    end

    test "NEW section show unresolved rooms without messages", ctx do
      h1 = customer_helpdesk(ctx.workspace, "C1")

      assert %Api.Room.Ok{roomId: room_id} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h1.id,
                 name: "NEW ROOM",
                 type: "public"
               })

      roster_flush(ctx.agent_api)

      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "new",
        sections: ["NEW", "ALL"],
        filters: %{"customerIds" => [h1.customer_id]}
      }

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{room: %{name: "NEW ROOM"}, sections: %{"NEW" => 1}},
               %Event.RosterSection{name: "NEW", count: 1}
             ] = view_events_sort(items)

      request = %Api.Room.Resolve{roomId: room_id}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Fog.Api.Event.RosterRoom{room: %{name: "NEW ROOM"}, sections: %{"ALL" => 1}},
               %Fog.Api.Event.RosterSection{name: "ALL", count: 1},
               %Fog.Api.Event.RosterSection{name: "NEW", count: 0}
             ] = roster_flush(ctx.agent_api, "new")
    end

    test "CUSTOMER section should use customer name", ctx do
      h1 = customer_helpdesk(ctx.workspace, "C1")
      h2 = customer_helpdesk(ctx.workspace, "C2")
      {c1_id, section1} = {h1.customer_id, "CUSTOMER:#{h1.customer_id}"}
      {c2_id, section2} = {h2.customer_id, "CUSTOMER:#{h2.customer_id}"}

      assert %Api.Room.Ok{} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h1.id,
                 name: "ROOM 1",
                 type: "public"
               })

      roster_flush(ctx.agent_api)

      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "customers",
        sections: ["CUSTOMER"],
        filters: %{"customerIds" => [h1.customer_id, h2.customer_id]}
      }

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{room: %{name: "ROOM 1"}, sections: %{^section1 => 1}},
               %Event.RosterSection{
                 name: "C1",
                 id: ^section1,
                 entityType: "CUSTOMER",
                 entity: %{name: "C1", id: ^c1_id},
                 count: 1
               }
             ] = view_events_sort(items)

      assert %Api.Room.Ok{} =
               ApiProcess.request(ctx.agent_api, %Api.Room.Create{
                 helpdeskId: h2.id,
                 name: "ROOM 2",
                 type: "public"
               })

      assert [
               %Event.RosterRoom{room: %{name: "ROOM 2"}, sections: %{^section2 => 1}},
               %Event.RosterSection{
                 name: "C2",
                 id: ^section2,
                 entityType: "CUSTOMER",
                 entity: %{name: "C2", id: ^c2_id},
                 count: 1
               }
             ] = roster_flush(ctx.agent_api, "customers")
    end

    test "TAG section should use tag value", ctx do
      request = %Api.Roster.OpenView{
        topic: ctx.topic,
        view: "assignees",
        sections: ["TAG:assignee"]
      }

      {t1_id, t1_name, s1_id} =
        {ctx.t_assigned_me.id, ctx.t_assigned_me.name, "TAG:" <> ctx.t_assigned_me.id}

      {t2_id, t2_name, s2_id} =
        {ctx.t_assigned.id, ctx.t_assigned.name, "TAG:" <> ctx.t_assigned.id}

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{room: %{name: "ASSIGNED ROOM"}, sections: %{^s2_id => 1}},
               %Event.RosterRoom{room: %{name: "ASSIGNED TO ME ROOM"}, sections: %{^s1_id => 1}},
               %Event.RosterSection{
                 name: ^t1_name,
                 id: ^s1_id,
                 entityType: "TAG",
                 entity: %{name: ^t1_name, id: ^t1_id},
                 count: 1
               },
               %Event.RosterSection{
                 name: ^t2_name,
                 id: ^s2_id,
                 entityType: "TAG",
                 entity: %{name: ^t2_name, id: ^t2_id},
                 count: 1
               }
             ] = view_events_sort(items)
    end

    test "ASSIGNED ME section respects group assignment", ctx do
      a3 = agent(ctx.workspace)
      group(ctx.vendor, a3, "oncall")
      t = tag(ctx.workspace, ":assignee:group:oncall")
      tag(ctx.ra_public, t)

      a3_api = ApiProcess.start(a3)
      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      %Api.Roster.SubOk{items: items} = ApiProcess.request(a3_api, request)

      assert [
               {"ARCHIVED ROOM", %{"ARCHIVED" => 1}},
               {"ASSIGNED ROOM", %{"ASSIGNED" => 2}},
               {"ASSIGNED TO ME ROOM", %{"ASSIGNED" => 1}},
               {"PINNED ROOM", %{"OPEN" => 1}},
               {"PUBLIC ROOM", %{"ASSIGNED TO ME" => 1}},
               {"ARCHIVED", 1},
               {"ASSIGNED", 2},
               {"ASSIGNED TO ME", 1},
               {"OPEN", 1}
             ] =
               view_events_sort(items)
               |> Enum.map(fn
                 %Event.RosterRoom{} = r -> {r.room.name, r.sections}
                 %Event.RosterSection{} = s -> {s.name, s.count}
               end)
    end
  end

  describe "resolving conversations" do
    setup ctx do
      [
        r: public_room(ctx.helpdesk, "ROOM 1")
      ]
    end

    test "new room has unresolved status", ctx do
      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterSection{name: "NEW", count: 1, unreadCount: 0, unresolvedCount: 1},
               %Event.RosterRoom{room: %Event.Room{name: "ROOM 1", resolved: false}, badge: nil}
             ] = items
    end

    test "resolving empty room updates counters", ctx do
      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Room.Resolve{roomId: ctx.r.id}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{room: %Event.Room{name: "ROOM 1", resolved: true}, badge: nil},
               %Event.RosterSection{name: "NEW", count: 0, unreadCount: 0, unresolvedCount: 0},
               %Event.RosterSection{name: "OPEN", count: 1, unreadCount: 0, unresolvedCount: 0}
             ] = roster_flush(ctx.agent_api)
    end

    test "hide badges for resolved room", ctx do
      request = %Api.Message.Create{
        roomId: ctx.r.id,
        text: "TEXT 2"
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      request = %Api.Room.Resolve{
        roomId: ctx.r.id
      }

      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterSection{name: "OPEN", count: 1, unreadCount: 0, unresolvedCount: 0},
               %Event.RosterRoom{
                 room: %Event.Room{name: "ROOM 1", resolved: true}
               }
             ] = items
    end

    test "resolve/unresolve updates counters", ctx do
      request = %Api.Message.Create{
        roomId: ctx.r.id,
        text: "TEXT 2"
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      request = %Api.Room.Resolve{roomId: ctx.r.id}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "ROOM 1", resolved: true},
                 badge: %Event.Badge{count: 0}
               },
               %Event.RosterSection{name: "OPEN", count: 1, unreadCount: 0, unresolvedCount: 0}
             ] = roster_flush(ctx.agent_api)

      request = %Api.Room.Unresolve{roomId: ctx.r.id}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "ROOM 1", resolved: false},
                 badge: %Event.Badge{count: 1}
               },
               %Event.RosterSection{name: "OPEN", count: 1, unreadCount: 1, unresolvedCount: 1}
             ] = roster_flush(ctx.agent_api)
    end

    test "resolved_timer_job", ctx do
      message(ctx.r, ctx.agent2, "M1")
      Repo.Room.resolve(ctx.r.id, true, ctx.agent2.id, ~U[2022-12-01 01:00:00.000000Z])

      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterSection{name: "OPEN", count: 1, unreadCount: 0, unresolvedCount: 0},
               %Event.RosterRoom{
                 room: %Event.Room{name: "ROOM 1", resolved: true},
                 badge: %Event.Badge{count: 0}
               }
             ] = items

      assert [] = roster_flush(ctx.agent_api)

      Fog.Notify.ResolvedTimerJob.run(~U[2022-12-02 01:00:00.000000Z])

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "ROOM 1", resolved: false},
                 badge: %Event.Badge{count: 1}
               },
               %Event.RosterSection{name: "OPEN", count: 1, unreadCount: 1, unresolvedCount: 1}
             ] = roster_flush(ctx.agent_api)
    end
  end

  describe "for user" do
    setup ctx do
      rooms = [
        r_pinned = public_room(ctx.helpdesk, "PINNED ROOM"),
        r_archived = public_room(ctx.helpdesk, "ARCHIVED ROOM"),
        r_private = private_room(ctx.helpdesk, [ctx.agent, ctx.user], "PRIVATE ROOM"),
        r_dialog = dialog_room(ctx.helpdesk, [ctx.agent, ctx.user], "DIALOG ROOM"),
        r_public = public_room(ctx.helpdesk, "PUBLIC ROOM"),
        r_deleted = public_room(ctx.helpdesk, "DELETED ROOM"),
        r_forbidden = private_room(ctx.helpdesk, [ctx.agent, ctx.user], "FORBIDDEN ROOM")
      ]

      Enum.map(rooms, fn r ->
        unless r.name == "PRIVATE ROOM" do
          m1 = message(r, ctx.agent, "M1")
          message(r, ctx.agent, "M2")
          seen(ctx.user, r, m1)
        end
      end)

      message(r_dialog, ctx.agent, "M2", [ctx.user])

      t_pin = tag(ctx.workspace, ":@#{ctx.user.id}:pin")
      tag(r_pinned, t_pin)
      archive(r_archived)
      Repo.Room.delete(r_deleted.id)
      Repo.Room.update_members(r_forbidden.id, [], [ctx.user.id])

      Kernel.binding()
    end

    test "subscription", ctx do
      request = %Api.Roster.Sub{
        topic: "helpdesk/#{ctx.helpdesk.id}/roster"
      }

      dialog_name = ctx.r_dialog.name
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert %{
               "ARCHIVED ROOM" => %{"ARCHIVED" => 1},
               "PINNED ROOM" => %{"PINNED" => 1},
               "PRIVATE ROOM" => %{"PRIVATE" => 1},
               "PUBLIC ROOM" => %{"INBOX" => 1},
               ^dialog_name => %{"DIRECT" => 1}
             } = filter_rooms(items)

      assert [
               %Event.RosterSection{name: "ARCHIVED", count: 1, unreadCount: 1, mentionsCount: 0},
               %Event.RosterSection{name: "DIRECT", count: 1, unreadCount: 1, mentionsCount: 1},
               %Event.RosterSection{name: "INBOX", count: 2, unreadCount: 2, mentionsCount: 0},
               %Event.RosterSection{name: "PINNED", count: 1, unreadCount: 1, mentionsCount: 0},
               %Event.RosterSection{name: "PRIVATE", count: 1, unreadCount: 0, mentionsCount: 0}
             ] = filter_sections(items)
    end

    test "unsub", ctx do
      request = %Api.Roster.Sub{
        topic: "helpdesk/#{ctx.helpdesk.id}/roster"
      }

      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.user_api, request)

      request = %Api.Roster.UnSub{
        topic: "helpdesk/#{ctx.helpdesk.id}/roster"
      }

      assert %Api.Roster.UnSubOk{} = ApiProcess.request(ctx.user_api, request)
    end

    test "range loading", ctx do
      for i <- 1..10 do
        r = public_room(ctx.helpdesk, "R#{i}")
        Repo.Room.resolve(r.id, true, ctx.agent2.id)
      end

      request = %Api.Roster.Sub{topic: "helpdesk/#{ctx.helpdesk.id}/roster"}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.user_api, request)

      request = %Api.Roster.GetRange{
        topic: "helpdesk/#{ctx.helpdesk.id}/roster",
        view: "main",
        sectionId: "INBOX",
        startPos: 1,
        limit: 5
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert [
               {"PUBLIC ROOM", %{"INBOX" => 1}},
               {"PINNED ROOM", %{"INBOX" => 2, "PINNED" => 1}},
               {"R10", %{"INBOX" => 3}},
               {"R9", %{"INBOX" => 4}},
               {"R8", %{"INBOX" => 5}}
             ] = items |> Enum.map(&{&1.room.name, &1.sections})

      request = %Api.Roster.GetRange{
        topic: "helpdesk/#{ctx.helpdesk.id}/roster",
        view: "main",
        sectionId: "INBOX",
        startPos: 6,
        limit: 10
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert [
               {"R7", %{"INBOX" => 6}},
               {"R6", %{"INBOX" => 7}},
               {"R5", %{"INBOX" => 8}},
               {"R4", %{"INBOX" => 9}},
               {"R3", %{"INBOX" => 10}},
               {"R2", %{"INBOX" => 11}},
               {"R1", %{"INBOX" => 12}}
             ] = items |> Enum.map(&{&1.room.name, &1.sections})
    end

    test "updating room tags update counters", ctx do
      request = %Api.Roster.Sub{topic: "helpdesk/#{ctx.helpdesk.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert %{
               "PUBLIC ROOM" => %{"INBOX" => 1}
             } = filter_rooms(items, ["PUBLIC ROOM"])

      assert [
               %Event.RosterSection{name: "INBOX", count: 2, unreadCount: 2, mentionsCount: 0},
               %Event.RosterSection{name: "PINNED", count: 1, unreadCount: 1, mentionsCount: 0}
             ] = filter_sections(items, ["INBOX", "PINNED"])

      request = %Api.Room.Update{roomId: ctx.r_public.id, tagsToAdd: [ctx.t_pin.name]}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.user_api, request)

      assert [
               %RosterRoom{
                 room: %Event.Room{name: "PUBLIC ROOM"},
                 sections: %{"INBOX" => 1, "PINNED" => 1}
               },
               %RosterSection{name: "PINNED", count: 2, unreadCount: 2}
             ] = roster_flush(ctx.user_api)
    end

    test "changing room name doesn't updates sections", ctx do
      request = %Api.Roster.Sub{topic: "helpdesk/#{ctx.helpdesk.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert %{
               "PUBLIC ROOM" => %{"INBOX" => 1}
             } = filter_rooms(items, ["PUBLIC ROOM"])

      assert [
               %Event.RosterSection{name: "INBOX", count: 2, unreadCount: 2, mentionsCount: 0}
             ] = filter_sections(items, ["INBOX"])

      request = %Api.Room.Update{roomId: ctx.r_public.id, name: "NEW NAME"}
      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "NEW NAME", id: public_room_id},
                 sections: %{"INBOX" => 1}
               }
             ] = roster_flush(ctx.user_api)

      assert public_room_id == ctx.r_public.id
    end

    test "removing room access updates sections", ctx do
      request = %Api.Roster.Sub{topic: "helpdesk/#{ctx.helpdesk.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert %{
               "PRIVATE ROOM" => %{"PRIVATE" => 1}
             } = filter_rooms(items, ["PRIVATE ROOM"])

      assert [
               %Event.RosterSection{name: "PRIVATE", count: 1, unreadCount: 0, mentionsCount: 0}
             ] = filter_sections(items, ["PRIVATE"])

      request = %Api.Room.Update{
        roomId: ctx.r_private.id,
        membersToRemove: [ctx.user.id],
        membersToAdd: []
      }

      assert %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)
      items = roster_flush(ctx.user_api)

      private_room_id = ctx.r_private.id

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: nil, id: ^private_room_id, remove: true},
                 badge: nil,
                 sections: %{}
               },
               %Event.RosterSection{name: "PRIVATE", count: 0, unreadCount: 0, mentionsCount: 0}
             ] = items
    end

    test "badge update", ctx do
      request = %Api.Roster.Sub{topic: "helpdesk/#{ctx.helpdesk.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert %{
               "PRIVATE ROOM" => %{"PRIVATE" => 1}
             } = filter_rooms(items, ["PRIVATE ROOM"])

      assert [
               %RosterSection{name: "PRIVATE", count: 1, unreadCount: 0, mentionsCount: 0}
             ] = filter_sections(items, ["PRIVATE"])

      request = %Api.Message.Create{
        roomId: ctx.r_private.id,
        text: "TEST @USER 1",
        mentions: [%Api.Message.Mention{id: ctx.user.id, text: "USER 1"}]
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.RosterRoom{
                 room: %Event.Room{name: "PRIVATE ROOM"},
                 badge: %Event.Badge{count: 1},
                 sections: %{"PRIVATE" => 1}
               },
               %Event.RosterSection{name: "PRIVATE", count: 1, unreadCount: 1, mentionsCount: 1}
             ] = roster_flush(ctx.user_api)
    end
  end

  describe "sorting" do
    setup ctx do
      rooms = [
        r_unresolved1 = public_room(ctx.helpdesk, "UNRESOLVED1"),
        r_unresolved2 = public_room(ctx.helpdesk, "UNRESOLVED2"),
        r_unread1 = public_room(ctx.helpdesk, "UNREAD1"),
        r_unread2 = public_room(ctx.helpdesk, "UNREAD2"),
        r_resolved = public_room(ctx.helpdesk, "RESOLVED"),
        r_read1 = public_room(ctx.helpdesk, "READ")
      ]

      # r_unresolved1 is fresh new room without messages
      message(r_unresolved2, ctx.agent2, "M1")

      Repo.Room.resolve(r_unread1.id, true, ctx.agent2.id)
      message(r_unread1, ctx.agent2, "M1")

      Repo.Room.resolve(r_unread2.id, true, ctx.agent2.id)
      message(r_unread2, ctx.agent2, "M1")

      Repo.Room.resolve(r_resolved.id, true, ctx.agent2.id)

      Repo.Room.resolve(r_read1.id, true, ctx.agent2.id)
      m = message(r_read1, ctx.agent2, "M1")
      seen(ctx.agent, r_read1, m)

      request = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, request)

      Kernel.binding()
    end

    test "order: resolved(by oldest), unread(by newest), others(by newest)", ctx do
      request = %Api.Roster.GetRange{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "main",
        sectionId: "OPEN",
        startPos: 1,
        limit: 100
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               {"UNRESOLVED2", 1},
               {"UNREAD2", 2},
               {"UNREAD1", 3},
               {"READ", 4},
               {"RESOLVED", 5}
             ] = items |> Enum.map(&{&1.room.name, &1.sections["OPEN"]})
    end

    test "unresolved sorted by oldest last message", ctx do
      request = %Api.Message.Create{
        roomId: ctx.r_unresolved1.id,
        text: "M1"
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      request = %Api.Roster.GetRange{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "main",
        sectionId: "OPEN",
        startPos: 1,
        limit: 100
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               {"UNRESOLVED2", 1},
               {"UNRESOLVED1", 2},
               {"UNREAD2", 3},
               {"UNREAD1", 4},
               {"READ", 5},
               {"RESOLVED", 6}
             ] = items |> Enum.map(&{&1.room.name, &1.sections["OPEN"]})
    end

    test "unread resolved sorted by newest last message", ctx do
      request = %Api.Message.Create{
        roomId: ctx.r_unread1.id,
        text: "M2"
      }

      assert %Api.Message.Ok{} = ApiProcess.request(ctx.agent2_api, request)

      request = %Api.Roster.GetRange{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "main",
        sectionId: "OPEN",
        startPos: 1,
        limit: 100
      }

      assert %Api.Roster.GetOk{items: items} = ApiProcess.request(ctx.agent_api, request)

      assert [
               {"UNRESOLVED2", 1},
               {"UNREAD1", 2},
               {"UNREAD2", 3},
               {"READ", 4},
               {"RESOLVED", 5}
             ] =
               items
               |> Enum.map(&{&1.room.name, &1.sections["OPEN"]})
    end

    test "users roster sorted by triage/last message only", ctx do
      triage_room(ctx.helpdesk, "TRIAGE")
      r_assigned = public_room(ctx.helpdesk, "ASSIGNED")
      t_assigned = tag(ctx.workspace, ":assignee:#{ctx.agent.id}")

      tag(r_assigned, t_assigned)
      m1 = message(r_assigned, ctx.agent, "M1")
      message(r_assigned, ctx.agent, "M2")
      seen(ctx.user, r_assigned, m1)

      m1 = message(ctx.r_resolved, ctx.agent, "M1")
      message(ctx.r_resolved, ctx.agent, "M2")
      seen(ctx.user, ctx.r_resolved, m1)
      Repo.Room.resolve(ctx.r_resolved.id, true, ctx.agent2.id)

      request = %Api.Roster.Sub{topic: "helpdesk/#{ctx.helpdesk.id}/roster", limit: 10}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.user_api, request)

      assert [
               {"ASSIGNED", 1, false, %{"INBOX" => 3}},
               {"READ", nil, true, %{"INBOX" => 4}},
               {"RESOLVED", 1, true, %{"INBOX" => 2}},
               {"TRIAGE", nil, false, %{"INBOX" => 1}},
               {"UNREAD1", nil, true, %{"INBOX" => 6}},
               {"UNREAD2", nil, true, %{"INBOX" => 5}},
               {"UNRESOLVED1", nil, false, %{"INBOX" => 8}},
               {"UNRESOLVED2", nil, false, %{"INBOX" => 7}},
               {"INBOX", 8, 2, 4}
             ] =
               items
               |> apply_events()
               |> Enum.map(
                 &case &1 do
                   %RosterRoom{} = r ->
                     {r.room.name, r.badge[:count], r.room.resolved, r.sections}

                   %RosterSection{} = s ->
                     {s.name, s.count, s.unreadCount, s.unresolvedCount}
                 end
               )
    end
  end

  defp filter_sections(items, names \\ []) do
    items
    |> Enum.filter(fn
      %Event.RosterSection{} = e -> has_name(e, names)
      _ -> false
    end)
    |> Enum.sort_by(& &1.id)
  end

  defp filter_rooms(items, names \\ []) do
    items
    |> Enum.filter(fn
      %Event.RosterRoom{} = e -> has_name(e, names)
      _ -> false
    end)
    |> Enum.map(&{&1.room.name, &1.sections})
    |> Enum.into(%{})
  end

  defp has_name(_, []), do: true
  defp has_name(%RosterSection{name: name}, names), do: name in names
  defp has_name(%RosterRoom{room: room}, names), do: room.name in names

  defp roster_flush(api, view \\ nil) do
    ApiProcess.flush(api)
    |> filter_view(view)
    |> apply_events()
  end

  defp filter_view(events, nil), do: events
  defp filter_view(events, view), do: Enum.filter(events, &(&1[:view] == view))

  defp apply_events(events) do
    events
    |> Enum.reduce(
      %{},
      &apply_event/2
    )
    |> Enum.map(fn {_, view} ->
      Map.values(view[:rooms] || %{}) ++
        Map.values(view[:sections] || %{})
    end)
    |> List.flatten()
    |> view_events_sort()
  end

  defp view_events_sort(events) do
    events
    |> Enum.sort_by(fn
      %Event.RosterRoom{} = r -> {r.view, 1, r.room.name}
      %Event.RosterSection{} = s -> {s.view, 2, s.name}
    end)
  end

  defp apply_event(%RosterRoom{view: view_name, room: %{id: id}} = e, acc) do
    put_in(acc, [Access.key(view_name, %{}), Access.key(:rooms, %{}), id], e)
  end

  defp apply_event(%RosterSection{view: view_name, name: name} = e, acc) do
    put_in(acc, [Access.key(view_name, %{}), Access.key(:sections, %{}), name], e)
  end

  defp apply_event(_, acc), do: acc

  defp setup_agent_env(ctx) do
    ha = internal_helpdesk(ctx.workspace)

    rooms = [
      ra_pinned = public_room(ha, "PINNED ROOM"),
      ra_assigned = public_room(ha, "ASSIGNED ROOM"),
      ra_assigned_to_me = public_room(ha, "ASSIGNED TO ME ROOM"),
      ra_archived = public_room(ha, "ARCHIVED ROOM"),
      ra_private = private_room(ha, [ctx.agent, ctx.agent2], "PRIVATE ROOM"),
      ra_dialog = dialog_room(ha, [ctx.agent, ctx.agent2], "DIALOG ROOM"),
      ra_public = public_room(ha, "PUBLIC ROOM"),
      ra_deleted = public_room(ha, "DELETED ROOM"),
      ra_forbidden = private_room(ha, [ctx.agent, ctx.agent2], "FORBIDDEN ROOM")
    ]

    Enum.map(rooms, fn r ->
      unless r.name == "PRIVATE ROOM" do
        m1 = message(r, ctx.agent2, "M1")
        message(r, ctx.agent2, "M2")
        seen(ctx.agent, r, m1)
      end
    end)

    message(ra_dialog, ctx.agent2, "M2", [ctx.agent])

    t_pin = tag(ctx.workspace, ":@#{ctx.agent.id}:pin")
    t_assigned_me = tag(ctx.workspace, ":assignee:#{ctx.agent.id}")
    t_assigned = tag(ctx.workspace, ":assignee:a1234")
    tag(ra_pinned, t_pin)
    tag(ra_assigned, t_assigned)
    tag(ra_assigned_to_me, t_assigned_me)
    archive(ra_archived)
    Repo.Room.delete(ra_deleted.id)
    Repo.Room.update_members(ra_forbidden.id, [], [ctx.agent.id])

    Kernel.binding()
  end
end
