defmodule Test.Api.PingTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.{Data, Repo, Api, Utils}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)
    agent_sess = Api.Session.for_agent(vendor.id, agent.id)
    agent_api = Api.init(agent_sess)

    h1 = helpdesk(workspace)
    user = user(h1)

    user_sess = Api.Session.for_user(vendor.id, h1.id, user.id)
    user_api = Api.init(user_sess)

    Kernel.binding()
  end

  describe "Last activity update for agent" do
    test "update empty last_activity_id", ctx do
      ts = DateTime.utc_now()
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.VendorAgentRole{last_activity_at: ^ts} =
               Data.VendorAgentRole
               |> Repo.get_by(vendor_id: ctx.vendor.id, agent_id: ctx.agent.id)
    end

    test "ignore empty lastActivityTs", ctx do
      ts = DateTime.utc_now()
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.agent_api)
      request = %Api.Ping.Ping{}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.VendorAgentRole{last_activity_at: ^ts} =
               Data.VendorAgentRole
               |> Repo.get_by(vendor_id: ctx.vendor.id, agent_id: ctx.agent.id)
    end

    test "ignore old lastActivityTs", ctx do
      ts0 = DateTime.utc_now()
      ts = DateTime.utc_now()
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.agent_api)
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts0)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.agent_api)

      assert %Data.VendorAgentRole{last_activity_at: ^ts} =
               Data.VendorAgentRole
               |> Repo.get_by(vendor_id: ctx.vendor.id, agent_id: ctx.agent.id)
    end
  end

  describe "Last activity update for user" do
    test "update empty last_activity_id", ctx do
      ts = DateTime.utc_now()
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.user_api)
      assert %Data.User{last_activity_at: ^ts} = Data.User |> Repo.get(ctx.user.id)
    end

    test "ignore empty lastActivityTs", ctx do
      ts = DateTime.utc_now()
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.user_api)
      request = %Api.Ping.Ping{}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.user_api)
      assert %Data.User{last_activity_at: ^ts} = Data.User |> Repo.get(ctx.user.id)
    end

    test "ignore old lastActivityTs", ctx do
      ts0 = DateTime.utc_now()
      ts = DateTime.utc_now()
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.user_api)
      request = %Api.Ping.Ping{lastActivityTs: Utils.to_unix(ts0)}
      assert {:reply, %Api.Ping.Pong{}, _} = Api.request(request, ctx.user_api)
      assert %Data.User{last_activity_at: ^ts} = Data.User |> Repo.get(ctx.user.id)
    end
  end
end
