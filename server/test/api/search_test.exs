defmodule Test.Api.SearchTest do
  use Fog.RepoCase, async: true

  alias Fog.Api
  alias Fog.Api.Event

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    h1 = helpdesk(workspace)
    ha = helpdesk(workspace, true)

    user = user(h1)

    user_sess = Api.Session.for_user(vendor.id, h1.id, user.id)
    user_api = Api.init(user_sess)

    agent = agent(workspace)
    agent_sess = Api.Session.for_agent(vendor.id, agent.id)
    agent_api = Api.init(agent_sess)

    h1_public = public_room(h1, "TEST1")
    h2_public = public_room(h1, "TEST2")
    ha_public = public_room(ha, "AGENT ROOM")
    Kernel.binding()
  end

  describe "Roster" do
    test "search with helpdesk context", ctx do
      req = %Api.Search.Roster{
        helpdeskId: ctx.h1.id,
        term: "TEST1"
      }

      assert {:reply, %Api.Search.Ok{items: [%Api.Event.Room{name: "TEST1"} | _]}, _} =
               Api.request(req, ctx.user_api)
    end

    test "results has proper resolved status", ctx do
      Repo.Room.resolve(ctx.h1_public.id, true, ctx.agent.id)
      message(ctx.h1_public, ctx.user, "TEST")
      req = %Api.Search.Roster{workspaceId: ctx.workspace.id, term: "TEST1"}

      assert {:reply,
              %Api.Search.Ok{items: [%Api.Event.Room{name: "TEST1", resolved: false} | _]},
              _} = Api.request(req, ctx.agent_api)
    end
  end

  describe "Room" do
    test "for user session", ctx do
      req = %Api.Search.Room{
        roomId: ctx.h1_public.id
      }

      assert {:reply, %Api.Search.Ok{items: [%Api.Event.Room{name: "TEST1"}]}, _} =
               Api.request(req, ctx.user_api)
    end

    test "for agent session", ctx do
      req = %Api.Search.Room{
        roomId: ctx.ha_public.id
      }

      assert {:reply, %Api.Search.Ok{items: [%Api.Event.Room{name: "AGENT ROOM"}]}, _} =
               Api.request(req, ctx.agent_api)
    end

    test "don't return info about room without access", ctx do
      req = %Api.Search.Room{
        roomId: ctx.ha_public.id
      }

      assert {:reply, %Api.Search.Err{code: 403}, _} = Api.request(req, ctx.user_api)
    end
  end

  describe "RoomMessages" do
    setup ctx do
      message(ctx.h1_public, ctx.agent, "TEST MESSAGE 1")
      message(ctx.h1_public, ctx.agent, "HELLO I NEED HELP TEST")
      :ok
    end

    test "for user session", ctx do
      req = %Api.Search.RoomMessages{
        roomId: ctx.h1_public.id,
        term: "help"
      }

      assert {:reply, %Api.Search.Ok{items: [%Event.Message{rawText: "HELLO I NEED HELP TEST"}]},
              _} = Api.request(req, ctx.user_api)
    end

    test "for agent session", ctx do
      req = %Api.Search.RoomMessages{
        roomId: ctx.h1_public.id,
        term: "test"
      }

      assert {:reply,
              %Api.Search.Ok{
                items: [
                  %Event.Message{rawText: "HELLO I NEED HELP TEST"},
                  %Event.Message{rawText: "TEST MESSAGE 1"}
                ]
              }, _} = Api.request(req, ctx.user_api)
    end
  end

  describe "Customers" do
    setup ctx do
      h1 = ctx.h1 |> Repo.preload(:customer)

      Data.Customer.update(h1.customer, name: "Little blue")
      |> Repo.update!()

      h2 = helpdesk(ctx.workspace) |> Repo.preload(:customer)

      Data.Customer.update(h2.customer, name: "Big green")
      |> Repo.update!()

      message(ctx.h1_public, ctx.agent, "TEST MESSAGE 1")
      %Data.Message{inserted_at: m_at} = message(ctx.h1_public, ctx.agent, "TEST MESSAGE 2")

      Kernel.binding()
    end

    test "for agent", ctx do
      req = %Api.Search.Customers{
        workspaceId: ctx.workspace.id,
        term: "blue bi",
        limit: 10
      }

      m_at = ctx.m_at |> Fog.Utils.to_unix()

      assert {:reply,
              %Api.Search.Ok{
                items: [
                  %Event.Customer{name: "Little blue", lastMessageAt: ^m_at, usersCount: 1},
                  %Event.Customer{name: "Big green", lastMessageAt: nil, usersCount: 0}
                ]
              }, _} = Api.request(req, ctx.agent_api)
    end

    test "by customer ids", ctx do
      req = %Api.Search.Customers{
        workspaceId: ctx.workspace.id,
        customerIds: [ctx.h1.customer.id],
        limit: 10
      }

      m_at = ctx.m_at |> Fog.Utils.to_unix()

      assert {:reply,
              %Api.Search.Ok{
                items: [
                  %Event.Customer{name: "Little blue", lastMessageAt: ^m_at, usersCount: 1}
                ]
              }, _} = Api.request(req, ctx.agent_api)
    end

    test "forbidden for users", ctx do
      req = %Api.Search.Customers{
        workspaceId: ctx.workspace.id,
        term: "blue bi",
        limit: 10
      }

      assert {:reply, %Api.Search.Err{code: 403}, _} = Api.request(req, ctx.user_api)
    end
  end
end
