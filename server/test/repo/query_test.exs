defmodule Test.Repo.Query do
  use Fog.RepoCase, async: true

  alias Fog.{Repo, Data, Utils}
  alias Fog.Repo.Query

  @ws %{name: "WS1", signature_type: "test", signature_secret: "test"}
  @user %{name: "User 1", email: "test@example.com"}
  @cust %{name: "CUSTOMER 1"}
  @vendor %{name: "VENDOR 1", workspaces: [@ws], customers: [@cust]}

  setup [:init_vendor, :init_helpdesk, :init_messages]

  defp init_vendor(_ctx) do
    v = Data.Vendor.new(@vendor) |> Repo.insert!()
    [w] = v.workspaces
    [c] = v.customers
    [vendor: v, customer: c, workspace: w]
  end

  defp init_helpdesk(ctx) do
    h =
      Data.Helpdesk.new(
        customer_id: ctx.customer.id,
        workspace_id: ctx.workspace.id,
        users: [@user],
        triage: %{}
      )
      |> Repo.insert!()

    [u] = h.users
    [helpdesk: h, user: u, room: h.triage]
  end

  defp init_messages(ctx) do
    messages =
      for i <- 1..20 do
        Data.Message.new(
          room_id: ctx.helpdesk.triage.id,
          from_user_id: ctx.user.id,
          text: "MESSAGE #{i}"
        )
        |> Repo.insert!()
      end

    ids = Enum.map(messages, & &1.id)
    [messages: messages, ids: ids]
  end

  describe "Load updated messages" do
    defp updated(ctx, opts) do
      Data.Message
      |> Query.with_ctx(ctx.room)
      |> Query.updated(opts)
      |> Repo.all()
      |> Enum.map(& &1.id)
    end

    test "since", ctx do
      ts = Enum.at(ctx.messages, 10).updated_at |> Utils.to_unix()
      ids = Enum.slice(ctx.ids, 11..20)
      limited = Enum.slice(ctx.ids, 11..13)
      assert ids == updated(ctx, %{since: ts, limit: 100})
      assert limited == updated(ctx, %{since: ts, limit: 3})
    end

    test "before", ctx do
      ts = Enum.at(ctx.messages, 10).updated_at |> Utils.to_unix()
      ids = Enum.slice(ctx.ids, 0..9) |> Enum.reverse()
      limited = Enum.slice(ctx.ids, 7..9) |> Enum.reverse()
      assert ids == updated(ctx, %{before: ts, limit: 100})
      assert limited == updated(ctx, %{before: ts, limit: 3})
    end
  end

  describe "Load inserted messages" do
    defp inserted(ctx, opts) do
      Data.Message
      |> Query.with_ctx(ctx.room)
      |> Query.inserted(opts)
      |> Repo.all()
      |> Enum.map(& &1.id)
    end

    test "since", ctx do
      ts = Enum.at(ctx.messages, 10).inserted_at |> Utils.to_unix()
      ids = Enum.slice(ctx.ids, 11..20)
      limited = Enum.slice(ctx.ids, 11..13)
      assert ids == inserted(ctx, %{since: ts, limit: 100})
      assert limited == inserted(ctx, %{since: ts, limit: 3})
    end

    test "before", ctx do
      ts = Enum.at(ctx.messages, 10).inserted_at |> Utils.to_unix()
      ids = Enum.slice(ctx.ids, 0..9) |> Enum.reverse()
      limited = Enum.slice(ctx.ids, 7..9) |> Enum.reverse()
      assert ids == inserted(ctx, %{before: ts, limit: 100})
      assert limited == inserted(ctx, %{before: ts, limit: 3})
    end

    test "from id range", ctx do
      startId = Enum.at(ctx.messages, 5).id
      endId = Enum.at(ctx.messages, 10).id
      ids = Enum.slice(ctx.ids, 5..10) |> Enum.reverse()
      assert ids == inserted(ctx, %{startId: startId, endId: endId, limit: 100})
    end
  end
end
