defmodule Fog.RepoTest do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  @cust1 %{external_uid: "ext-1", name: "CUST ext-1"}
  @cust2 %{external_uid: "ext-2", name: "CUST ext-2"}
  @vendor_with_customers %{name: "VENDOR 1", customers: [@cust1, @cust2]}

  describe "vendor" do
    test "creates new vendor with customers" do
      vendor =
        Data.Vendor.new(@vendor_with_customers)
        |> Repo.insert!()

      assert %Data.Vendor{name: "VENDOR 1"} = vendor
      assert [_, _] = vendor.customers
    end
  end
end
