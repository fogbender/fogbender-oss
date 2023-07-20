defmodule Test.Api.Encoder.BsonTest do
  use ExUnit.Case
  alias Fog.Api
  alias Fog.Api.Echo
  import ExUnit.CaptureLog

  setup do
    api = Fog.Api.init(:session1)
    [api: api]
  end

  describe "API" do
    test "support bson encoding", ctx do
      encoded = %Echo.Get{msgId: 1, message: "test"} |> Api.Encoder.Bson.encode()

      assert {:reply, %Echo.Ok{msgId: 1, message: "ECHO: test"}, _} =
               Api.request(:bson, :raw, encoded, ctx.api)
    end

    @tag capture_log: true
    test "return 400 invalid format error for broken bson encoding", ctx do
      encoded = "broken"

      assert capture_log(fn ->
               assert {:reply, %Api.Error.Fatal{code: 400, error: "Invalid request format"}, _} =
                        Api.request(:bson, :raw, encoded, ctx.api)
             end) =~ ~r".*[error].*Encoder error.*"
    end
  end
end
