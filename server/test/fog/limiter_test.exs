defmodule Fog.LimiterTest do
  use ExUnit.Case, async: true

  test "limit requests per key" do
    key = {:visitor, "test@example.com"}
    assert :ok == Fog.Limiter.put(key, 10000)
    assert {:limit, _} = Fog.Limiter.put(key, 1)
  end

  test "request allowed after limit" do
    key = {:visitor, "test2@example.com"}
    assert :ok == Fog.Limiter.put(key, 100)
    Process.sleep(500)
    assert :ok == Fog.Limiter.put(key, 100)
  end
end
