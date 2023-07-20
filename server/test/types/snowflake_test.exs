defmodule Test.Types.Snowflake do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  defp vendor(id, name),
    do: Repo.insert!(Data.Vendor.new(id: id, name: name))

  describe "Snowflake" do
    test "string ids has the same ordering as database ids" do
      v1 = vendor(9000, "v1")
      v2 = vendor(100_000, "v2")

      v1 = Repo.get(Data.Vendor, v1.id)
      v2 = Repo.get(Data.Vendor, v2.id)
      assert [v1.id, v2.id] == Enum.sort([v1.id, v2.id])
    end

    test "string id represents bigest id" do
      max = Bitwise.bsl(1, 64) - 1
      {:ok, vid} = Fog.Types.VendorId.cast(max)
      assert {:ok, max} == Fog.Types.VendorId.dump(vid)
    end
  end
end
