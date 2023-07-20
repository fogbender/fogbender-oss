defmodule Test.Api.ReaderRoleTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.Api

  setup do
    vendor = vendor()
    workspace = workspace(vendor)

    agent = agent(workspace)

    agent_api =
      Api.Session.for_agent(vendor.id, agent.id)
      |> Api.init()

    internal_helpdesk = helpdesk(workspace, true)
    customer_helpdesk = helpdesk(workspace, false)

    internal_room = public_room(internal_helpdesk)
    customer_room = public_room(customer_helpdesk)

    msg1 = %Api.Message.Create{
      roomId: internal_room.id,
      text: "some message in internal room"
    }

    msg2 = %Api.Message.Create{
      roomId: customer_room.id,
      text: "some message in customer-facing room"
    }

    assert {:reply, %Api.Message.Ok{messageId: msg1_id}, _} = Api.request(msg1, agent_api)
    assert {:reply, %Api.Message.Ok{messageId: msg2_id}, _} = Api.request(msg2, agent_api)

    reader = agent(workspace, "reader")

    reader_api =
      Api.Session.for_agent(vendor.id, reader.id)
      |> Api.init()

    Kernel.binding()
  end

  test "reader can read in internal rooms", ctx do
    assert [%Api.Event.Message{}] = load(ctx.reader_api, ctx.internal_room)
  end

  test "reader can post to internal rooms", ctx do
    req = %Api.Message.Create{
      roomId: ctx.internal_room.id,
      text: "other message to internal room"
    }

    assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.reader_api)
  end

  test "reader can read messages from customer-facing rooms", ctx do
    assert [%Api.Event.Message{}] = load(ctx.reader_api, ctx.customer_room)
  end

  test "reader can forward messages from customer-facing rooms", ctx do
    req = %Api.Message.Create{
      roomId: ctx.internal_room.id,
      linkRoomId: ctx.customer_room.id,
      linkStartMessageId: ctx.msg2_id,
      linkEndMessageId: ctx.msg2_id,
      linkType: "forward",
      text: "Forwarded"
    }

    assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.reader_api)
  end

  test "reader can not post messages to customer-facing rooms", ctx do
    req = %Api.Message.Create{
      roomId: ctx.customer_room.id,
      text: "other message to customer-facing room"
    }

    assert {:reply, %Api.Message.Err{code: 403}, _} = Api.request(req, ctx.reader_api)
  end

  test "reader can update his own messages", ctx do
    req1 = %Api.Message.Create{
      roomId: ctx.internal_room.id,
      text: "message to internal room"
    }

    assert {:reply, %Api.Message.Ok{messageId: msg_id}, _} = Api.request(req1, ctx.reader_api)

    req2 = %Api.Message.Update{
      messageId: msg_id,
      text: "edited message to internal room"
    }

    assert {:reply, %Api.Message.Ok{}, _} = Api.request(req2, ctx.reader_api)
  end

  test "reader can not update others messages", ctx do
    req1 = %Api.Message.Update{
      messageId: ctx.msg1_id,
      text: "edited message1"
    }

    assert {:reply, %Api.Message.Err{code: 403}, _} = Api.request(req1, ctx.reader_api)

    req2 = %Api.Message.Update{
      messageId: ctx.msg2_id,
      text: "edited message2"
    }

    assert {:reply, %Api.Message.Err{code: 403}, _} = Api.request(req2, ctx.reader_api)
  end

  test "reader can create internal rooms only", ctx do
    req1 = %Api.Room.Create{
      helpdeskId: ctx.internal_helpdesk.id,
      name: "internal room from reader",
      type: "public"
    }

    assert {:reply, %Api.Room.Ok{}, _} = Api.request(req1, ctx.reader_api)

    req2 = %Api.Room.Create{
      helpdeskId: ctx.customer_helpdesk.id,
      name: "customer-facing room from reader",
      type: "public"
    }

    assert {:reply, %Api.Room.Err{code: 403}, _} = Api.request(req2, ctx.reader_api)
  end

  defp load(api, room) do
    msg = %Api.Stream.Get{topic: topic(room)}
    assert {:reply, %Api.Stream.GetOk{items: items}, _} = Api.request(msg, api)
    items
  end

  defp topic(room), do: "room/#{room.id}/messages"
end
