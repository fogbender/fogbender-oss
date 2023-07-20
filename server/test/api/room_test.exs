defmodule Test.Api.RoomTest do
  import ExUnit.CaptureLog
  use Fog.RepoCase, async: true

  alias Fog.{Api, ApiProcess, Utils}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)
    agent_sess = Api.Session.for_agent(vendor.id, agent.id)
    agent_api = Api.init(agent_sess)
    agent_process = ApiProcess.start(agent)

    ha = helpdesk(workspace, true)
    h1 = helpdesk(workspace)

    [user, u12, u13] = users(3, h1)

    user_sess = Api.Session.for_user(vendor.id, h1.id, user.id)
    user_api = Api.init(user_sess)
    user_process = ApiProcess.start(user)

    [a1, a2, a3] = agents(3, workspace)

    ha_public = public_room(ha)
    h1_public = public_room(h1)

    tag1 = tag(workspace, "#tag1")

    Kernel.binding()
  end

  describe "Room create" do
    test "agent creates room", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: "TEST ROOM",
        type: "public",
        members: [],
        tags: [],
        meta: []
      }

      subscribe(ctx.agent_process, "workspace/#{ctx.workspace.id}/rooms")

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      agent_id = ctx.agent.id

      assert [%Api.Event.Room{createdBy: %{id: ^agent_id}}] = ApiProcess.flush(ctx.agent_process)
    end

    test "agent creates private room", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: "TEST ROOM",
        type: "private",
        members: [ctx.a2.id]
      }

      subscribe(ctx.agent_process, "workspace/#{ctx.workspace.id}/rooms")

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      agent_id = ctx.agent.id

      assert [%Api.Event.Room{createdBy: %{id: ^agent_id}}] = ApiProcess.flush(ctx.agent_process)
    end

    test "agent creates dialog room", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        type: "dialog",
        members: [ctx.a2.id]
      }

      subscribe(ctx.agent_process, "workspace/#{ctx.workspace.id}/rooms")

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      agent_id = ctx.agent.id

      assert [%Api.Event.Room{createdBy: %{id: ^agent_id}}] = ApiProcess.flush(ctx.agent_process)
    end

    test "user creates room", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: "TEST ROOM",
        type: "public",
        members: [],
        tags: [],
        meta: []
      }

      subscribe(ctx.user_process, "helpdesk/#{ctx.h1.id}/rooms")

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.user_api)

      user_id = ctx.user.id

      assert [%Api.Event.Room{createdBy: %{id: ^user_id}}] = ApiProcess.flush(ctx.user_process)
    end

    test "error 409 in case of duplicated name", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: ctx.h1_public.name,
        type: "public"
      }

      assert capture_log(fn ->
               assert {:reply,
                       %Api.Error.Fatal{code: 409, data: %{name: ["has already been taken"]}},
                       _} = Api.request(request, ctx.agent_api)
             end) =~ ~r".[error].*DB conflict processing"
    end

    test "agent creates room with named tags", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: "NEW TEST ROOM",
        type: "public",
        tags: ["#TAG1", ":system:tag1", ":@#{ctx.agent.id}:pin"]
      }

      assert {:reply, %Api.Room.Ok{roomId: rid}, _} = Api.request(request, ctx.agent_api)
      assert %Data.Room{tags: tags} = Repo.get(Data.Room, rid) |> Repo.preload(tags: :tag)

      assert ["#TAG1", ":@#{ctx.agent.id}:pin", ":system:tag1"] ==
               tags |> Enum.map(& &1.tag.name) |> Enum.sort()
    end

    test "agent can't create room with another's user tags", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: "NEW TEST ROOM",
        type: "public",
        tags: ["#TAG1", ":system:tag1", ":@a1234:pin"]
      }

      assert {:reply, %Api.Room.Err{code: 403}, _} = Api.request(request, ctx.agent_api)
    end

    test "user creates room with named tags", ctx do
      request = %Api.Room.Create{
        helpdeskId: ctx.h1.id,
        name: "NEW TEST ROOM",
        type: "public",
        tags: ["#TAG1", ":system:tag1", ":@#{ctx.user.id}:pin"]
      }

      assert {:reply, %Api.Room.Ok{roomId: rid}, _} = Api.request(request, ctx.user_api)
      assert %Data.Room{tags: tags} = Repo.get(Data.Room, rid) |> Repo.preload(tags: :tag)

      assert ["#TAG1", ":@#{ctx.user.id}:pin", ":system:tag1"] ==
               tags |> Enum.map(& &1.tag.name) |> Enum.sort()
    end
  end

  describe "Room update" do
    test "agent role owner updates tags in room", ctx do
      request = %Api.Room.Update{
        roomId: ctx.ha_public.id,
        tagsToAdd: [ctx.tag1.id, "#NEWTAG"],
        tagsToRemove: []
      }

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.Room{tags: tags} =
               Repo.get(Data.Room, ctx.ha_public.id) |> Repo.preload(tags: :tag)

      assert ["#NEWTAG", ctx.tag1.name] == Enum.map(tags, & &1.tag.name) |> Enum.sort()
    end

    test "agent role admin updates tags in room", ctx do
      request = %Api.Room.Update{
        roomId: ctx.ha_public.id,
        tagsToAdd: [ctx.tag1.id],
        tagsToRemove: []
      }

      agent_api = api_for_agent_role(ctx, "admin")
      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, agent_api)
    end

    test "agent role agent updates tags in room", ctx do
      request = %Api.Room.Update{
        roomId: ctx.ha_public.id,
        tagsToAdd: [ctx.tag1.id, ":system:tag"],
        tagsToRemove: []
      }

      agent_api = api_for_agent_role(ctx, "agent")
      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, agent_api)

      assert %Data.Room{tags: tags} =
               Repo.get(Data.Room, ctx.ha_public.id) |> Repo.preload(tags: :tag)

      assert [ctx.tag1.name, ":system:tag"] == Enum.map(tags, & &1.tag.name) |> Enum.sort()
    end

    test "user can update mpin tags", ctx do
      request = %Api.Room.Update{
        roomId: ctx.h1_public.id,
        tagsToAdd: [":mpin:m1234", ":@#{ctx.user.id}:mpin:m1234"],
        tagsToRemove: [":mpin:m333"]
      }

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.user_api)

      assert %Data.Room{tags: tags} =
               Repo.get(Data.Room, ctx.h1_public.id)
               |> Repo.preload(tags: :tag)

      assert [":@#{ctx.user.id}:mpin:m1234", ":mpin:m1234"] ==
               Enum.map(tags, & &1.tag.name)
               |> Enum.sort()
    end

    test "user can't update non mpin tags", ctx do
      for tag <- [":sys:tag", "@a1234:personal:tag", "#public"] do
        request = %Api.Room.Update{
          roomId: ctx.h1_public.id,
          tagsToAdd: [":mpin:m1234", ":@#{ctx.user.id}:mpin:m1234", tag],
          tagsToRemove: [":mpin:m333"]
        }

        assert {:reply, %Api.Room.Err{code: 403}, _} = Api.request(request, ctx.user_api)
      end
    end
  end

  describe "Resolve conversation" do
    test "resolve", ctx do
      request = %Api.Room.Resolve{
        roomId: ctx.ha_public.id
      }

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.Room{
               resolved: true,
               resolved_til: nil,
               resolved_by_agent_id: agent_id,
               resolved_at: at
             } = Repo.Room.get(ctx.ha_public.id)

      assert agent_id == ctx.agent.id
      assert not is_nil(at)
    end

    test "resolve til timestamp", ctx do
      request = %Api.Room.Resolve{
        roomId: ctx.ha_public.id,
        tilTs: Utils.to_unix(~U[2022-12-01 01:00:00.000000Z])
      }

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.Room{
               resolved: true,
               resolved_til: ~U[2022-12-01 01:00:00.000000Z],
               resolved_by_agent_id: agent_id,
               resolved_at: at
             } = Repo.Room.get(ctx.ha_public.id)

      assert agent_id == ctx.agent.id
      assert not is_nil(at)
    end

    test "unresolve", ctx do
      request = %Api.Room.Resolve{
        roomId: ctx.ha_public.id
      }

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      request = %Api.Room.Unresolve{
        roomId: ctx.ha_public.id
      }

      assert {:reply, %Api.Room.Ok{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.Room{
               resolved: false,
               resolved_by_agent_id: agent_id,
               resolved_at: at
             } = Repo.Room.get(ctx.ha_public.id)

      assert agent_id == ctx.agent.id
      assert not is_nil(at)
    end
  end

  defp api_for_agent_role(ctx, role) do
    agent = agent(ctx.workspace, role)
    agent_sess = Api.Session.for_agent(ctx.vendor.id, agent.id)
    Api.init(agent_sess)
  end

  defp subscribe(api, topic) do
    req = %Api.Stream.Sub{topic: topic}
    assert %Api.Stream.SubOk{} = ApiProcess.request(api, req)
  end
end
