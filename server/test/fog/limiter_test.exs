defmodule Fog.LimiterTest do
  use ExUnit.Case, async: true

  test "limit requests per key" do
    key = {:visitor, "test@example.com"}
    assert :ok == Fog.Limiter.put(key, 1)
    assert {:limit, _} = Fog.Limiter.put(key, 1)
    Process.sleep(1000)
    assert :ok == Fog.Limiter.put(key, 1)
  end
end
