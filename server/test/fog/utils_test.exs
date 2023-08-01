defmodule Test.Utils do
  use ExUnit.Case
  import Fog.Utils

  describe "coalesce" do
    test "returns first non-nil element" do
      assert nil == coalesce([])
      assert nil == coalesce([nil, nil])
      assert 1 == coalesce([1])
      assert 2 == coalesce([nil, 2, 3])
    end
  end
end
