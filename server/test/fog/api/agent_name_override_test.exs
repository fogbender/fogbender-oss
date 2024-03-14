defmodule Fog.Api.AgentNameOverrideTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.{Api, ApiProcess, Api.Event}

  setup do
    vendor = vendor()
    agent1 = agent(vendor, "agent", "Agent 1")
    agent2 = agent(vendor, "agent", "Agent 2")
    workspace = workspace(vendor)

    workspace =
      Data.Workspace.update(workspace, agent_name_override: "Support Agent")
      |> Repo.update!()

    agent_api = ApiProcess.start(agent1)

    helpdesk = helpdesk(workspace)
    room = public_room(helpdesk)
    user1 = user(helpdesk, "USER 1")
    user_api = ApiProcess.start(user1)

    seen(user1, room, %{id: "m0"})
    Kernel.binding()
  end

  describe "Workspace have agent_name_override set" do
    test "hide agent name in typing from users", ctx do
      sub(ctx.user_api, "room/#{ctx.room.id}/typing")

      request = %Api.Typing.Set{roomId: ctx.room.id}
      :ok = ApiProcess.request(ctx.agent_api, request)

      assert [%Event.Typing{data: [%{name: "Support Agent"}]}] = ApiProcess.flush(ctx.user_api)
    end

    test "hide agent name in new message", ctx do
      sub(ctx.user_api, "room/#{ctx.room.id}/messages")
      request = %Api.Message.Create{roomId: ctx.room.id, text: "TEXT"}
      %Api.Message.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [%Event.Message{fromName: "Support Agent"}] = ApiProcess.flush(ctx.user_api)
    end

    test "hide agent name in mentions", ctx do
      sub(ctx.user_api, "room/#{ctx.room.id}/messages")

      request = %Api.Message.Create{
        roomId: ctx.room.id,
        text: "TEXT @USER 1, @AGENT 2",
        mentions: [
          %Api.Message.Mention{id: ctx.user1.id, text: "USER 1"},
          %Api.Message.Mention{id: ctx.agent2.id, text: "AGENT 2"}
        ]
      }

      %Api.Message.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [%Event.Message{mentions: mentions}] = ApiProcess.flush(ctx.user_api)
      assert [%{name: "Support Agent"}, %{name: "USER 1"}] = Enum.sort_by(mentions, & &1.id)
    end

    test "hide agent name in badge", ctx do
      sub(ctx.user_api, "user/#{ctx.user1.id}/badges")
      request = %Api.Message.Create{roomId: ctx.room.id, text: "TEXT"}
      %Api.Message.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [
               %Event.Badge{
                 firstUnreadMessage: %{fromName: "Support Agent"},
                 lastRoomMessage: %{fromName: "Support Agent"}
               }
             ] = ApiProcess.flush(ctx.user_api)
    end

    test "hide agent name in room members and created_by", ctx do
      sub(ctx.user_api, "helpdesk/#{ctx.helpdesk.id}/rooms")

      request = %Api.Room.Create{
        helpdeskId: ctx.helpdesk.id,
        name: "TEST ROOM",
        type: "private",
        members: [ctx.agent1.id, ctx.user1.id]
      }

      %Api.Room.Ok{} = ApiProcess.request(ctx.agent_api, request)

      assert [%Event.Room{members: members, createdBy: created_by}] =
               ApiProcess.flush(ctx.user_api)

      assert [%{name: "Support Agent", email: ""}, %{name: "USER 1"}] =
               Enum.sort_by(members, & &1.name)

      assert %{name: "Support Agent", email: "", imageUrl: ""} = created_by
    end
  end

  defp sub(api, topic) do
    assert %Api.Stream.SubOk{} = ApiProcess.request(api, %Api.Stream.Sub{topic: topic})
    :ok
  end
end
