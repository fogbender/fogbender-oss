defmodule Test.Api.Encoder.JsonTest do
  use ExUnit.Case
  alias Fog.Api
  alias Fog.Api.Echo
  import ExUnit.CaptureLog

  setup do
    api = Fog.Api.init(:session1)
    [api: api]
  end

  describe "API" do
    test "support json encoding", ctx do
      encoded = %Echo.Get{msgId: 1, message: "test"} |> Api.Encoder.Json.encode()

      assert {:reply, %Echo.Ok{msgId: 1, message: "ECHO: test"}, _} =
               Api.request(:json, :raw, encoded, ctx.api)
    end

    @tag capture_log: true
    test "return 400 invalid format error for broken json encoding", ctx do
      encoded = "broken"

      assert capture_log(fn ->
               assert {:reply, %Api.Error.Fatal{code: 400, error: "Invalid request format"}, _} =
                        Api.request(:json, :raw, encoded, ctx.api)
             end) =~ ~r".*[error].*Encoder error.*"
    end

    test "supports structs as field values" do
      assert {:ok, %Echo.Get{msgType: "Echo.Get", message: %Echo.Get{msgType: "Echo.Get"}}} =
               %Echo.Get{msgId: 1, message: %Echo.Get{}}
               |> Api.Encoder.Json.encode()
               |> Api.Encoder.Json.decode()
    end

    test "supports list of structs as field values" do
      assert {:ok, %Echo.Get{msgType: "Echo.Get", message: [%Echo.Get{msgType: "Echo.Get"}]}} =
               %Echo.Get{msgId: 1, message: [%Echo.Get{}]}
               |> Api.Encoder.Json.encode()
               |> Api.Encoder.Json.decode()
    end
  end
end
