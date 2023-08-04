defmodule Test.Api.TagTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  alias Fog.{Api, ApiProcess, Api.Event}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)
    agent_api = ApiProcess.start(agent)

    helpdesk = helpdesk(workspace)
    user = user(helpdesk)
    user_api = ApiProcess.start(user)

    r1 = public_room(helpdesk, "ROOM1")
    r2 = public_room(helpdesk, "ROOM2")

    t1 = tag(workspace, "#tag1")
    t2 = tag(workspace, "#tag2")
    tag(r1, t1)
    tag(r2, t1)
    tag(r2, t2)

    Kernel.binding()
  end

  describe "Tag create" do
    test "agent creates public tag", ctx do
      request = %Api.Tag.Create{
        workspaceId: ctx.workspace.id,
        tag: "#NEWTAG"
      }

      assert %Api.Tag.Ok{} = ApiProcess.request(ctx.agent_api, request)
    end

    test "agent fails to create system tag", ctx do
      request = %Api.Tag.Create{
        workspaceId: ctx.workspace.id,
        tag: ":system:tag"
      }

      assert %Api.Tag.Err{code: 403} = ApiProcess.request(ctx.agent_api, request)
    end

    test "user fails to create any tag", ctx do
      request = %Api.Tag.Create{
        workspaceId: ctx.workspace.id,
        tag: "#NEWTAG"
      }

      assert %Api.Tag.Err{code: 403} = ApiProcess.request(ctx.user_api, request)
    end
  end

  describe "Tag update" do
    test "agent updates public tag", ctx do
      request = %Api.Tag.Update{
        workspaceId: ctx.workspace.id,
        tag: "#tag1",
        newTag: "#NEWTAG"
      }

      subscribe(ctx.agent_api, "workspace/#{ctx.workspace.id}/rooms")
      assert %Api.Tag.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.Room{name: "ROOM1", tags: [%{name: "#NEWTAG"}]},
               %Event.Room{name: "ROOM2", tags: [%{name: "#NEWTAG"}, %{name: "#tag2"}]}
             ] = ApiProcess.flush(ctx.agent_api)

      assert %Data.Tag{} = Repo.get_by(Data.Tag, name: "#NEWTAG")
    end

    test "user fails to update any tag", ctx do
      request = %Api.Tag.Update{
        workspaceId: ctx.workspace.id,
        tag: "#tag1",
        newTag: "#NEWTAG"
      }

      assert %Api.Tag.Err{code: 403} = ApiProcess.request(ctx.user_api, request)
    end
  end

  describe "Tag delete" do
    test "agent deletes public tag", ctx do
      request = %Api.Tag.Delete{
        workspaceId: ctx.workspace.id,
        tag: "#tag1"
      }

      subscribe(ctx.agent_api, "workspace/#{ctx.workspace.id}/rooms")
      assert %Api.Tag.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.Room{name: "ROOM1", tags: []},
               %Event.Room{name: "ROOM2", tags: [%{name: "#tag2"}]}
             ] = ApiProcess.flush(ctx.agent_api) |> Enum.sort_by(& &1.name)
    end

    test "user fails to delete any tag", ctx do
      request = %Api.Tag.Delete{
        workspaceId: ctx.workspace.id,
        tag: "#tag1"
      }

      assert %Api.Tag.Err{code: 403} = ApiProcess.request(ctx.user_api, request)
    end
  end

  defp subscribe(api, topic) do
    req = %Api.Stream.Sub{topic: topic}
    assert %Api.Stream.SubOk{} = ApiProcess.request(api, req)
  end
end
