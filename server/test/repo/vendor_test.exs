defmodule Test.Repo.Vendor do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  setup do
    v = vendor()
    c1 = customer(v, false, "ex1")
    c2 = customer(v, false, "ex2")
    Kernel.binding()
  end

  describe "update customer info" do
    test "create new customers with info", ctx do
      data = %{
        "customers" => [
          %{
            "customer_id" => "ex3",
            "source" => "hubspot",
            "data" => %{"name" => "cust 3", "size" => 100}
          }
        ]
      }

      Repo.Vendor.update_customers_info(ctx.v.id, data)

      assert %Data.Customer{
               name: "cust 3",
               info_logs: [%Data.CustomerInfoLog{data: %{"size" => 100}}]
             } = Data.Customer |> Repo.get_by(external_uid: "ex3") |> Repo.preload(:info_logs)
    end

    test "update old customer name and add info", ctx do
      data = %{
        "customers" => [
          %{
            "customer_id" => "ex2",
            "source" => "hubspot",
            "data" => %{"name" => "cust 2 new", "size" => 100}
          }
        ]
      }

      Repo.Vendor.update_customers_info(ctx.v.id, data)

      assert %Data.Customer{
               name: "cust 2 new",
               info_logs: [%Data.CustomerInfoLog{data: %{"size" => 100}}]
             } = Data.Customer |> Repo.get_by(external_uid: "ex2") |> Repo.preload(:info_logs)
    end

    test "adds new info to log ", ctx do
      data = %{
        "customers" => [
          %{
            "customer_id" => "ex2",
            "source" => "hubspot",
            "data" => %{"name" => "cust 2 new", "size" => 100}
          }
        ]
      }

      Repo.Vendor.update_customers_info(ctx.v.id, data)

      data = %{
        "customers" => [
          %{
            "customer_id" => "ex2",
            "source" => "hubspot",
            "data" => %{"name" => "cust 22", "size" => 10}
          }
        ]
      }

      Repo.Vendor.update_customers_info(ctx.v.id, data)

      assert %Data.Customer{
               name: "cust 22",
               info_logs: [
                 %Data.CustomerInfoLog{data: %{"size" => 100}},
                 %Data.CustomerInfoLog{data: %{"size" => 10}}
               ]
             } = Data.Customer |> Repo.get_by(external_uid: "ex2") |> Repo.preload(:info_logs)
    end
  end
end
