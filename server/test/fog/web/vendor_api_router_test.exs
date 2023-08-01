defmodule Test.Web.VendorApiRouterTest do
  use Fog.RepoCase, async: false
  alias Fog.Repo

  setup do
    vendor = vendor()
    agent = agent(vendor)
    token = Repo.VendorApiToken.create(vendor.id, agent.id, ["customer:update"], "test token")
    Kernel.binding()
  end

  describe "update customers info" do
    setup ctx do
      [url: Fog.env(:fog_api_url) <> "/vendor_api/#{ctx.vendor.id}/customers"]
    end

    test "with valid token", ctx do
      data =
        %{
          "customers" => [
            %{
              "customer_id" => "cust1",
              "source" => "hubspot",
              "data" => %{"name" => "Customer 1", "size" => 100, "domain" => "cust1.org"}
            },
            %{
              "customer_id" => "cust2",
              "source" => "hubspot",
              "data" => %{"name" => "Customer 2", "size" => 10, "domain" => "cust2.org"}
            }
          ]
        }
        |> Jason.encode!()

      res =
        Tesla.post(ctx.url, data,
          headers: [
            {"Content-Type", "application/json"},
            {"authorization", "Bearer " <> ctx.token}
          ]
        )

      assert {:ok, %{status: 200}} = res
    end

    test "fails without auth header", ctx do
      res = Tesla.post(ctx.url, "")
      assert {:ok, %{status: 401}} = res
    end

    test "fails without valid token", ctx do
      %{token_id: id} = Fog.Token.validate(ctx.token)
      :ok = Fog.Repo.VendorApiToken.mark_deleted(ctx.vendor.id, ctx.agent.id, id)
      res = Tesla.post(ctx.url, "", headers: [{"authorization", "Bearer " <> ctx.token}])
      assert {:ok, %{status: 401}} = res
    end

    test "fails without token with valid vendor", ctx do
      token =
        Repo.VendorApiToken.create("v12324", ctx.agent.id, ["customer:update"], "test token")

      res = Tesla.post(ctx.url, "", headers: [{"authorization", "Bearer " <> token}])
      assert {:ok, %{status: 403}} = res
    end

    test "fails without token with valid scopes", ctx do
      token =
        Repo.VendorApiToken.create(ctx.vendor.id, ctx.agent.id, ["user:update"], "test token")

      res = Tesla.post(ctx.url, "", headers: [{"authorization", "Bearer " <> token}])
      assert {:ok, %{status: 403}} = res
    end
  end
end
