defmodule Test.Repo.SearchRoom do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  alias Fog.{Repo, Data}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)

    ha = internal_helpdesk(workspace)
    h1 = helpdesk(workspace)
    h2 = helpdesk(workspace)
    [u11, u12, u13] = users(3, h1, "blue user")
    [u21, u22, u23] = users(3, h2, "red user")
    [a1, a2, a3] = agents(3, workspace)

    ha_public = public_room(ha, "ha_public")
    h1_public = public_room(h1, "h1_public")
    h2_public = public_room(h2, "h2_public")

    ha_private_with_me = private_room(ha, [agent, a2], "ha_private_with_me")
    h1_private_with_me = private_room(h1, [agent, a3, u11], "h1_private_with_me")
    h2_private_with_me = private_room(h2, [agent, a2, u21], "h2_private_with_me")

    ha_private_no_me = private_room(ha, [a1, a2], "ha_private_no_me")
    h1_private_no_me = private_room(h1, [a1, a3, u12], "h1_private_no_me")
    h2_private_no_me = private_room(h2, [a2, u21, u22], "h2_private_no_me")

    ha_dialog_with_me = dialog_room(ha, [agent, a2], "ha_dialog_with_me")
    h1_dialog_with_me = dialog_room(h1, [agent, u11], "h1_dialog_with_me")
    h2_dialog_with_me = dialog_room(h2, [agent, u21], "h2_dialog_with_me")

    ha_dialog_no_me = dialog_room(ha, [a1, a2], "ha_dialog_no_me")
    h1_dialog_no_me = dialog_room(h1, [u11, u12], "h1_dialog_no_me")
    h2_dialog_no_me = dialog_room(h2, [u21, u22], "h2_dialog_no_me")

    tag0 = tag(workspace, "tag0")
    ha_public = Fog.Repo.Room.update_tags(ha_public.id, [tag0.id], [], nil, nil)

    # second vendor should not change search result
    v2 = vendor([a1, a2, a3])
    w2 = workspace(v2, [a1, a2])
    a21 = agent(w2)
    h21 = internal_helpdesk(w2)
    h22 = helpdesk(w2)
    public_room(h21, "V2 agent room")
    public_room(h22, "V2 user room")
    user(h22)

    binding()
  end

  defp ids(list), do: Enum.map(list, & &1.id)
  defp names(list), do: Enum.map(list, & &1.name)

  describe "Search rooms" do
    test "should return first all public rooms in workspace", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "Public"
        )
        |> names()

      assert [
               "h2_public",
               "h1_public",
               "ha_public"
               | _
             ] = res
    end

    test "should return only public rooms with type=public", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          type: "public"
        )
        |> names()
        |> Enum.sort()

      assert [
               "h1_public",
               "h2_public",
               "ha_public"
             ] = res
    end

    test "should return first all private rooms in workspace with membership", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "private"
        )
        |> names()

      assert [
               "h2_private_with_me",
               "h1_private_with_me",
               "ha_private_with_me"
               | _
             ] = res
    end

    test "should return my dialogs and users without dialogs from workspace", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "blue",
          type: "dialog"
        )
        |> Enum.map(&{&1.name, &1.type, &1.created})

      assert res == [
               {ctx.u11.name, "dialog", true},
               {ctx.u13.name, "dialog", false},
               {ctx.u12.name, "dialog", false}
             ]
    end

    test "should return all my dialogs and agents without dialogs from workspace", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "agent",
          type: "dialog"
        )

      assert Enum.sort(names(res)) == Enum.sort(names([ctx.a2, ctx.a1, ctx.a3]))

      assert Enum.all?(res, fn %Data.Room{type: t, helpdesk_id: hid} ->
               t == "dialog" and hid == ctx.ha.id
             end)

      assert [] == [ctx.ha_dialog_with_me.id] -- ids(res)
      assert [] == res |> Enum.filter(fn %{id: id} -> id == nil end)

      assert [[ctx.ha_dialog_with_me.inserted_at, ctx.ha_dialog_with_me.updated_at]] ==
               for(r <- res, r.id == ctx.ha_dialog_with_me.id, do: [r.inserted_at, r.updated_at])
    end

    test "should return room by tag id", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_ids: [ctx.tag0.id]
        )

      assert ids(res) == [ctx.ha_public.id]
    end

    test "should return room by tag name", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_names: [ctx.tag0.name]
        )

      assert ids(res) == [ctx.ha_public.id]
    end

    test "should return room by tag id and term", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_ids: [ctx.tag0.id],
          term: "ha_public"
        )

      assert ids(res) == [ctx.ha_public.id]
    end

    test "should return empty by tag id and term", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_ids: [ctx.tag0.id],
          term: "x"
        )

      assert [] == res
    end

    test "should return empty by tag name and term", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_names: [ctx.tag0.name],
          term: "x"
        )

      assert [] == res
    end

    test "should return room by tag name and term", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_ids: nil,
          tag_names: [ctx.tag0.name],
          term: "ha_public"
        )

      assert ids(res) == [ctx.ha_public.id]
    end

    test "should return room by tag id, name, and term", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          tag_ids: [ctx.tag0.id],
          tag_names: [ctx.tag0.name],
          term: "ha_public"
        )

      assert ids(res) == [ctx.ha_public.id]
    end

    test "return dialogs with room members for private room mentions", ctx do
      group(ctx.vendor, ctx.a1, "test")
      r1 = private_room(ctx.h1, [ctx.agent, ctx.a2, ctx.u11], "Pivate room test")
      room_group(r1, "test")

      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          mention_room_id: r1.id
        )
        |> Enum.map(&Fog.Utils.coalesce([&1.user_id, &1.agent_id]))
        |> Enum.sort()

      assert res == [ctx.a1.id, ctx.a2.id, ctx.u11.id]
    end

    test "return dialogs with agents and users from helpdesk for public room mentions", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          mention_room_id: ctx.h1_public.id
        )
        |> Enum.map(&Fog.Utils.coalesce([&1.user_id, &1.agent_id]))
        |> Enum.sort()

      assert res == [ctx.a1.id, ctx.a2.id, ctx.a3.id, ctx.u11.id, ctx.u12.id, ctx.u13.id]
    end

    test "search for mention respects term filter", ctx do
      a = agent(ctx.vendor, "owner", "James Bond")

      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          mention_room_id: ctx.h1_public.id,
          term: "bond"
        )
        |> Repo.preload(:customer)
        |> Enum.map(&(&1.agent_id || &1.user_id))

      assert res == [a.id]
    end

    test "search by name should also include customer name", ctx do
      c = customer(ctx.vendor, false, nil, "Orange customer")
      h = customer_helpdesk(ctx.workspace, c)
      public_room(h, "Black room")
      public_room(h, "Public room new")
      public_room(ctx.h1, "orange room")

      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "orange black"
        )
        |> names()

      assert [
               "Black room",
               "orange room",
               "Public room new"
               | _
             ] = res
    end

    test "return monolog if with_monolog flag true", ctx do
      res =
        Repo.SearchRoom.for_agent(
          ctx.agent.id,
          workspace_id: ctx.workspace.id,
          mention_room_id: ctx.h1_private_with_me.id,
          with_monolog: true
        )
        |> Enum.map(&Fog.Utils.coalesce([&1.user_id, &1.agent_id]))
        |> Enum.sort()

      assert res == [
               ctx.agent.id,
               ctx.a3.id,
               ctx.u11.id
             ]
    end
  end

  defp tag_scoping_setup(ctx) do
    scoping_f = flag("User Tag Scoping")
    flag(ctx.workspace, scoping_f)
    tag1 = tag(ctx.workspace, "#tag1")
    tag2 = tag(ctx.workspace, "#tag2")
    case_tag = tag(ctx.workspace, ":case")
    common_tag = tag(ctx.workspace, "#common_tag")
    room_case_tag1 = tag(ctx.workspace, ":r1:case")
    room_case_tag2 = tag(ctx.workspace, ":r2:case")

    tag(ctx.u11, [tag1, common_tag])
    tag(ctx.u12, [tag2, common_tag])
    tag(ctx.u13, [tag1, tag2, common_tag])

    h1_main1_room = public_room(ctx.h1, "h1_main1_room")
    h1_main2_room = public_room(ctx.h1, "h1_main2_room")
    h1_case1_room = public_room(ctx.h1, "h1_case1_room")
    h1_case2_room = public_room(ctx.h1, "h1_case2_room")

    tag(h1_main1_room, [tag1])
    tag(h1_main2_room, [tag2])
    tag(h1_case1_room, [common_tag, case_tag, room_case_tag1, tag1])
    tag(h1_case2_room, [common_tag, case_tag, room_case_tag2, tag2])

    binding()
  end

  describe "for_user in tag scoped workspaces" do
    setup [:tag_scoping_setup]

    test "workspace has \"User tag scoping\" feature flag", ctx do
      helpdesk = Repo.Helpdesk.get(ctx.h1.id) |> Fog.Repo.preload(workspace: :feature_flags)
      workspace_feature_flags = Enum.map(helpdesk.workspace.feature_flags, & &1.feature_flag_id)
      assert ["User Tag Scoping"] == workspace_feature_flags
    end

    test "respect user tags", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u12.id,
          helpdesk_id: ctx.h1.id,
          term: "h1"
        )

      assert [
               "h1_case2_room",
               "h1_case1_room",
               "h1_main2_room",
               "h1_private_no_me",
               "h1_public" | _
             ] = names(res)
    end

    test "search by tag name", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u12.id,
          helpdesk_id: ctx.h1.id,
          tag_names: [ctx.room_case_tag2.name]
        )

      assert Enum.sort(names(res)) ==
               [
                 "h1_case2_room"
               ]
    end

    test "search by tag id", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u12.id,
          helpdesk_id: ctx.h1.id,
          tag_ids: [ctx.tag2.id]
        )

      assert Enum.sort(names(res)) ==
               [
                 "h1_case2_room",
                 "h1_main2_room"
               ]
    end

    test "search by dialogs still works", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u12.id,
          helpdesk_id: ctx.h1.id
        )

      assert Enum.sort(names(res)) ==
               [
                 ctx.u11.name,
                 ctx.u13.name,
                 ctx.h1_case1_room.name,
                 ctx.h1_case2_room.name,
                 ctx.h1_main2_room.name,
                 ctx.h1_private_no_me.name,
                 ctx.h1_public.name
               ]

      assert [] == [ctx.h1_dialog_no_me.id] -- ids(res)
    end

    test "search by dialogs only", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u12.id,
          helpdesk_id: ctx.h1.id,
          type: "dialog"
        )

      assert Enum.sort(names(res)) ==
               [
                 ctx.u11.name,
                 ctx.u13.name
               ]
    end

    test "search by public rooms only", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u12.id,
          helpdesk_id: ctx.h1.id,
          type: "public"
        )

      assert Enum.sort(names(res)) ==
               [
                 ctx.h1_case1_room.name,
                 ctx.h1_case2_room.name,
                 ctx.h1_main2_room.name,
                 ctx.h1_public.name
               ]
    end

    test "return monolog if with_monolog flag true", ctx do
      res =
        Repo.SearchRoom.for_user(
          ctx.u11.id,
          helpdesk_id: ctx.h1.id,
          mention_room_id: ctx.h1_private_with_me.id,
          with_monolog: true
        )
        |> Enum.map(&Fog.Utils.coalesce([&1.user_id, &1.agent_id]))
        |> Enum.sort()

      assert res == [
               ctx.agent.id,
               ctx.u11.id
             ]
    end
  end

  describe "term_fields support" do
    setup ctx do
      hx = customer_helpdesk(ctx.workspace, "XXXX customer")
      hy = customer_helpdesk(ctx.workspace, "YYYY customer")
      rxy = public_room(hx, "YYYY room RXY")
      rxx = public_room(hx, "XXXX room RXX")
      ryx = public_room(hy, "XXXX room RYX")
      ryy = public_room(hy, "YYYY room RYY")
      Kernel.binding()
    end

    test "searches by customer name and room by default", ctx do
      res =
        Repo.SearchRoom.for_agent(ctx.agent.id, workspace_id: ctx.workspace.id, term: "XXXX")
        |> Enum.map(& &1.name)

      assert res == [
               "XXXX room RXX",
               "XXXX room RYX",
               "YYYY room RXY"
             ]
    end

    test "search only by customer name", ctx do
      res =
        Repo.SearchRoom.for_agent(ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "YYYY",
          term_fields: ["cname"]
        )
        |> Enum.map(& &1.name)

      assert res == [
               "YYYY room RYY",
               "XXXX room RYX"
             ]
    end

    test "search only by room name", ctx do
      res =
        Repo.SearchRoom.for_agent(ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "YYYY",
          term_fields: ["rname"]
        )
        |> Enum.map(& &1.name)

      assert res == [
               "YYYY room RYY",
               "YYYY room RXY"
             ]
    end

    test "search only by message", ctx do
      m1 = message(ctx.ryy, ctx.agent, "XXXX message RYY")
      message(ctx.ryy, ctx.agent, "YYYY message RYY")
      message(ctx.ryx, ctx.agent, "BBBB message RYX")
      message(ctx.rxy, ctx.agent, "CCCC message RXY")

      res =
        Repo.SearchRoom.for_agent(ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "XXXX",
          term_fields: ["message"]
        )
        |> Enum.map(&{&1.name, &1.relevant_message_id})

      assert res == [
               {"YYYY room RYY", m1.id}
             ]
    end

    test "search only by author name", ctx do
      aX = agent(ctx.workspace, "owner", "AGENT XXXX")
      aY = agent(ctx.workspace, "owner", "AGENT YYYY")
      message(ctx.ryy, aX, "AAAA message")
      m = message(ctx.ryy, aX, "BBBB message")
      message(ctx.ryy, aY, "XXXX message 1")
      message(ctx.rxy, aY, "XXXX message 2")
      message(ctx.ryx, aY, "XXXX message 3")

      res =
        Repo.SearchRoom.for_agent(ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "XXXX",
          term_fields: ["aname"]
        )
        |> Repo.preload(:relevant_message)
        |> Enum.map(&{&1.name, &1.relevant_message.id, &1.relevant_message.text})

      assert res == [
               {"YYYY room RYY", m.id, "BBBB message"}
             ]
    end

    test "search by all fields", ctx do
      aX = agent(ctx.workspace, "owner", "Agent XXXX")
      message(ctx.rxx, aX, "TTTT message 1")
      message(ctx.rxx, ctx.agent, "TTTT message 2")
      message(ctx.rxy, ctx.agent, "TTTT message 3")
      message(ctx.ryy, aX, "BBBB message 4")
      message(ctx.ryy, ctx.agent, "CCCC message 5")

      res =
        Repo.SearchRoom.for_agent(ctx.agent.id,
          workspace_id: ctx.workspace.id,
          term: "XXXX TTTT",
          term_fields: ["cname", "rname", "aname", "message"]
        )
        |> Repo.preload(:relevant_message)
        |> Enum.map(&{&1.name, &1.relevant_message[:text]})

      assert res == [
               {"XXXX room RXX", "TTTT message 1"},
               {"YYYY room RXY", "TTTT message 3"},
               {"YYYY room RYY", "BBBB message 4"},
               {"Agent XXXX", nil},
               {"XXXX room RYX", nil}
             ]
    end
  end
end
