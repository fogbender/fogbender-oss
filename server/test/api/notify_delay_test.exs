defmodule Test.Api.NotifyDelayTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.{Data, Repo, Api, ApiProcess}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    [a1, a2] = agents(2, workspace)
    a1_api = start_api(a1)
    a2_api = start_api(a2)

    ha = internal_helpdesk(workspace)
    h1 = helpdesk(workspace)

    [u1, u2] = users(2, h1)
    u1_api = start_api(u1)
    u2_api = start_api(u2)

    ar = public_room(ha)
    ur = public_room(h1)
    tr = triage_room(h1)

    Repo.FeatureOption.vendor_defaults(
      agent_customer_following: false,
      user_triage_following: false
    )

    Kernel.binding()
  end

  describe "for agent" do
    test "notify on new message in followed room", ctx do
      assert %Api.Message.Ok{} = send_seen(ctx.a1_api, ctx.ar, %{id: 0})
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ar, "TEST1")
      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.a1_api, mid)
    end

    test "notify on message in autofollowed room", ctx do
      Repo.FeatureOption.vendor_defaults(agent_customer_following: true)
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ur, "TEST1")
      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.a1_api, mid)
    end

    test "notify on mention in not followed room", ctx do
      assert %Api.Message.Ok{messageId: mid} =
               send_message(ctx.a2_api, ctx.ar, "TEST1 @#{ctx.a1.name}", [
                 {ctx.a1.id, ctx.a1.name}
               ])

      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.a1_api, mid)
    end

    test "don't notify on message in not followed room after mention", ctx do
      assert %Api.Message.Ok{messageId: mid} =
               send_message(ctx.a2_api, ctx.ar, "TEST1 @#{ctx.a1.name}", [
                 {ctx.a1.id, ctx.a1.name}
               ])

      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.a1_api, mid)
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ar, "TEST2")
      assert :ok = send_notify_timeout(ctx.a1_api, mid)
    end

    test "don't notify on message in unfollowed room", ctx do
      assert %Api.Message.Ok{} = send_seen(ctx.a1_api, ctx.ar, %{id: 0})
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ar, "TEST1")
      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.a1_api, mid)
      assert %Api.Message.Ok{} = send_unseen(ctx.a1_api, ctx.ar)
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ar, "TEST2")
      assert :ok = send_notify_timeout(ctx.a1_api, mid)
    end

    test "don't notify after seen event", ctx do
      assert %Api.Message.Ok{} = send_seen(ctx.a1_api, ctx.ar, %{id: 0})
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ar, "TEST1")
      assert %Api.Message.Ok{} = send_seen(ctx.a1_api, ctx.ar, %{id: mid})
      assert :ok = send_notify_timeout(ctx.a1_api, mid)
    end

    test "don't notify on message in room assigned to another agent", ctx do
      Repo.FeatureOption.vendor_defaults(agent_customer_following: true)
      tag = tag(ctx.workspace, ":assignee:a12234")
      tag(ctx.ur, [tag])
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.a2_api, ctx.ur, "TEST1")
      assert :ok = send_notify_timeout(ctx.a1_api, mid)
    end

    test "notify on mention in room assigned to another agent", ctx do
      Repo.FeatureOption.vendor_defaults(agent_customer_following: true)
      tag = tag(ctx.workspace, ":assignee:a12234")
      tag(ctx.ur, [tag])

      assert %Api.Message.Ok{messageId: mid} =
               send_message(ctx.a2_api, ctx.ur, "TEST1 @#{ctx.a1.name}", [
                 {ctx.a1.id, ctx.a1.name}
               ])

      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.a1_api, mid)
    end
  end

  describe "for user" do
    test "notify on new message in followed room", ctx do
      assert %Api.Message.Ok{} = send_seen(ctx.u1_api, ctx.ur, %{id: 0})
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.u2_api, ctx.ur, "TEST1")
      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.u1_api, mid)
    end

    test "notify on message in autofollowed room", ctx do
      Repo.FeatureOption.vendor_defaults(user_triage_following: true)
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.u2_api, ctx.tr, "TEST1")
      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.u1_api, mid)
    end

    test "notify on mention in not followed room", ctx do
      assert %Api.Message.Ok{messageId: mid} =
               send_message(ctx.u2_api, ctx.ur, "TEST1 @#{ctx.u1.name}", [
                 {ctx.u1.id, ctx.u1.name}
               ])

      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.u1_api, mid)
    end

    test "don't notify on message in not followed room after mention", ctx do
      assert %Api.Message.Ok{messageId: mid} =
               send_message(ctx.u2_api, ctx.ur, "TEST1 @#{ctx.u1.name}", [
                 {ctx.u1.id, ctx.u1.name}
               ])

      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.u1_api, mid)
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.u2_api, ctx.ur, "TEST2")
      assert :ok = send_notify_timeout(ctx.u1_api, mid)
    end

    test "don't notify on message in unfollowed room", ctx do
      assert %Api.Message.Ok{} = send_seen(ctx.u1_api, ctx.ur, %{id: 0})
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.u2_api, ctx.ur, "TEST1")
      assert %Api.Event.Notification.Message{id: ^mid} = send_notify_timeout(ctx.u1_api, mid)
      assert %Api.Message.Ok{} = send_unseen(ctx.u1_api, ctx.ur)
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.u2_api, ctx.ur, "TEST2")
      assert :ok = send_notify_timeout(ctx.u1_api, mid)
    end

    test "don't notify after seen event", ctx do
      assert %Api.Message.Ok{} = send_seen(ctx.u1_api, ctx.ur, %{id: 0})
      assert %Api.Message.Ok{messageId: mid} = send_message(ctx.u2_api, ctx.ur, "TEST1")
      assert %Api.Message.Ok{} = send_seen(ctx.u1_api, ctx.ur, %{id: mid})
      assert :ok = send_notify_timeout(ctx.u1_api, mid)
    end
  end

  defp send_seen(api, room, message) do
    msg = %Api.Message.Seen{
      roomId: room.id,
      messageId: message.id
    }

    ApiProcess.request(api, msg)
  end

  defp send_unseen(api, room) do
    msg = %Api.Message.Unseen{
      roomId: room.id
    }

    ApiProcess.request(api, msg)
  end

  defp send_notify_timeout(api, mid) do
    msg = {:notify, mid}
    ApiProcess.request(api, msg)
  end

  defp send_message(api, room, text, mentions \\ []) do
    msg = %Api.Message.Create{
      roomId: room.id,
      text: text,
      clientId: "test-id",
      mentions:
        mentions |> Enum.map(fn {id, text} -> %Api.Message.Mention{id: id, text: text} end)
    }

    ApiProcess.request(api, msg)
  end

  defp start_api(actor) do
    api = ApiProcess.start(actor)
    subscribe(api, seen_topic(actor))
    subscribe(api, notification_message_topic(actor))
    api
  end

  defp seen_topic(%Data.Agent{id: id}), do: "agent/#{id}/seen"
  defp seen_topic(%Data.User{id: id}), do: "user/#{id}/seen"

  defp notification_message_topic(%Data.Agent{id: id}), do: "agent/#{id}/notifications"
  defp notification_message_topic(%Data.User{id: id}), do: "user/#{id}/notifications"

  defp subscribe(api, topic) do
    req = %Api.Stream.Sub{topic: topic}
    assert %Api.Stream.SubOk{} = ApiProcess.request(api, req)
  end
end
