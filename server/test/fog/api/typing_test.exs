defmodule Test.Api.TypingTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.Api

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)
    agent_sess = Api.Session.for_agent(vendor.id, agent.id)
    agent_api = Api.init(agent_sess)

    h1 = helpdesk(workspace)
    room = public_room(h1)
    user = user(h1)

    user_sess = Api.Session.for_user(vendor.id, h1.id, user.id)
    user_api = Api.init(user_sess)

    h2 = helpdesk(workspace)
    room2 = public_room(h2)

    Kernel.binding()
  end

  describe "typing command" do
    test "forbidden for guest", ctx do
      sess = Api.Session.guest()
      api = Api.init(sess)
      request = %Api.Typing.Set{roomId: ctx.room.id, msgId: "test"}

      assert {:reply, %Api.Typing.SetErr{code: 403, error: "Forbidden", msgId: "test"}, _} =
               Api.request(request, api)
    end

    test "from agent", ctx do
      request = %Api.Typing.Set{roomId: ctx.room.id}
      assert {:ok, _} = Api.request(request, ctx.agent_api)
    end

    test "from user", ctx do
      request = %Api.Typing.Set{roomId: ctx.room.id}
      assert {:ok, _} = Api.request(request, ctx.agent_api)
    end

    test "forbidden for user from another workspace", ctx do
      request = %Api.Typing.Set{roomId: ctx.room2.id}

      assert {:reply, %Api.Typing.SetErr{code: 403}, _} = Api.request(request, ctx.user_api)
    end
  end
end
