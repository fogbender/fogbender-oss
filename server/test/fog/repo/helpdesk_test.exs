defmodule Test.Repo.Helpdesk do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    Kernel.binding()
  end

  describe "search" do
    test "case insensitive", ctx do
      named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 1")
      named_helpdesk(ctx.vendor, ctx.workspace, "CustOmer 2")
      named_helpdesk(ctx.vendor, ctx.workspace, "ggg")

      assert ["CustOmer 2", "CUSTOMER 1"] =
               search(ctx.workspace, "customer")
               |> Enum.map(& &1.customer.name)
    end

    test "order - full words, wildcarded words, bigrams", ctx do
      [
        "Grey big customer",
        "Red big customer",
        "Big grey customer",
        "Little green customer",
        "Yellow little customer"
      ]
      |> Enum.map(&named_helpdesk(ctx.vendor, ctx.workspace, &1))

      assert [
               "Big grey customer",
               "Grey big customer",
               "Red big customer",
               "Little green customer"
             ] =
               search(ctx.workspace, "Big grey")
               |> Enum.map(& &1.customer.name)
    end

    test "returns users count", ctx do
      h1 = named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 1")
      h2 = named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 2")
      named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 3")
      users(3, h1)
      users(2, h2)

      assert [
               {"CUSTOMER 3", 0},
               {"CUSTOMER 2", 2},
               {"CUSTOMER 1", 3}
             ] =
               search(ctx.workspace, "Customer")
               |> Enum.map(&{&1.customer.name, &1.users_count})
    end

    test "returns last message at", ctx do
      h1 = named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 1")
      h2 = named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 2")
      r1 = public_room(h1)
      r2 = public_room(h1)
      public_room(h2)
      u = user(h1)
      message(r1, u, "M1")
      message(r2, u, "M2")
      %Data.Message{inserted_at: at} = message(r1, u, "M3")

      assert [
               {"CUSTOMER 2", nil},
               {"CUSTOMER 1", ^at}
             ] =
               search(ctx.workspace, "Customer")
               |> Enum.map(&{&1.customer.name, &1.last_message_at})
    end

    test "by ids", ctx do
      h1 = named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 1")
      h2 = named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 2")
      named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 3")
      named_helpdesk(ctx.vendor, ctx.workspace, "CUSTOMER 4")

      assert [
               "CUSTOMER 2",
               "CUSTOMER 1"
             ] =
               search(ctx.workspace, "", [h1.customer.id, h2.customer.id])
               |> Enum.map(& &1.customer.name)
    end
  end

  defp named_helpdesk(vendor, workspace, name) do
    c = customer(vendor, false, nil, name)
    customer_helpdesk(workspace, c) |> Repo.preload(:customer)
  end

  defp search(workspace, term, ids \\ []) do
    Repo.Helpdesk.search(workspace.id, ids, term, 100)
    |> Repo.preload(:customer)
  end
end
