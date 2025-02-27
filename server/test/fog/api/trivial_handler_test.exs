defmodule Fog.Api.TrivialHandler do
  use Fog.Api.Handler

  defmsg(Ok, [:message])
  defmsg(Request, [:message])
  defmsg(Multi, [:message1, :message2])
  defmsg(Failed)

  def info(c, s), do: info(c, s, [])

  def info({:replied, message, new_session}, _session, _pipeline),
    do: {:reply, message, new_session}

  def info({:echo, message}, _session, _pipeline), do: {:reply, %{message: message}}
  def info(%Request{message: message}, _session, _pipeline), do: {:reply, %Ok{message: message}}

  def info(%Multi{message1: m1, message2: m2}, _session, _pipeline),
    do: {:reply, [%Ok{message: m1}, %Ok{message: m2}]}

  def info(%Failed{}, _session, _pipeline), do: raise("failed")

  def info(_, _, _), do: :skip
end

defmodule Fog.Api.TrivialHandler2 do
  use Fog.Api.Handler

  def info(c, s), do: info(c, s, [])
  def info({:handler2_echo, message}, _session, _pipeline), do: {:reply, message, :session3}
  def info(_, _, _), do: :skip
end

defmodule Test.Api.TrivialHandlerTest do
  use ExUnit.Case
  alias Fog.Api
  alias Fog.Api.{TrivialHandler, TrivialHandler2, Encoder}
  import ExUnit.CaptureLog

  setup do
    api = Fog.Api.init(:session1, [TrivialHandler, TrivialHandler2])
    [api: api]
  end

  describe "API handler" do
    test "skip incoming message", ctx do
      assert {:reply, "test", %Api{session: :session3}} =
               Api.info({:handler2_echo, "test"}, ctx.api)
    end

    test "reply without updating session", ctx do
      assert {:reply, %{message: "message"}, %Api{session: :session1}} =
               Api.info({:echo, "message"}, ctx.api)
    end

    test "reply and update session", ctx do
      assert {:reply, "reply message", %Api{session: :session2}} =
               Api.info({:replied, "reply message", :session2}, ctx.api)
    end

    test "set msgId in reply message", ctx do
      assert {:reply, %TrivialHandler.Ok{msgId: 1, message: "reply message"},
              %Api{session: :session1}} =
               Api.info(
                 %TrivialHandler.Request{msgId: 1, message: "reply message"},
                 ctx.api
               )
    end

    test "allow unknown message for info", ctx do
      assert capture_log(fn ->
               assert {:ok, %Api{session: :session1}} = Api.info(%{type: "unknown"}, ctx.api)
             end) =~ ~r".*[warn].*Unknown API message.*"
    end

    test "don't allow unknown message for request", ctx do
      assert capture_log(fn ->
               assert {:reply, %Api.Error.Fatal{code: 400, error: "Unknown request"},
                       %Api{session: :session1}} = Api.request(%{type: "unknown"}, ctx.api)
             end) =~ ~r".*[warn].*Unknown API message.*"
    end

    test "return 500 internal error on crash during request processing", ctx do
      assert capture_log(fn ->
               assert {:reply,
                       %Api.Error.Fatal{msgId: 1, code: 500, error: "Internal server error"},
                       %Api{session: :session1}} =
                        Api.request(%TrivialHandler.Failed{msgId: 1}, ctx.api)
             end) =~ ~r".*[error].*Handler exception.*"
    end

    test "return 400 in case of invalid msgType but keep msgId if present", ctx do
      json = Jason.encode!(%{msgType: "BadMsg", msgId: 1})

      assert capture_log(fn ->
               assert {:reply,
                       %Api.Error.Fatal{
                         msgId: 1,
                         code: 400,
                         error: "Invalid request type: BadMsg"
                       }, %Api{session: :session1}} = Api.request(:json, :raw, json, ctx.api)
             end) =~ ~r".[error].*Invalid request type:.*BadMsg"
    end
  end

  describe "Multiple responses" do
    test "set msgId on all replies", ctx do
      assert {:reply,
              [
                %TrivialHandler.Ok{msgId: 1, message: "MESSAGE 1"},
                %TrivialHandler.Ok{msgId: 1, message: "MESSAGE 2"}
              ],
              %Api{session: :session1}} =
               Api.info(
                 %TrivialHandler.Multi{msgId: 1, message1: "MESSAGE 1", message2: "MESSAGE 2"},
                 ctx.api
               )
    end

    test "all replies encoded", ctx do
      assert {:reply, reply_json, %Api{session: :session1}} =
               Api.info(
                 :raw,
                 :json,
                 %TrivialHandler.Multi{msgId: 1, message1: "MESSAGE 1", message2: "MESSAGE 2"},
                 ctx.api
               )

      assert [
               {:ok, %TrivialHandler.Ok{msgId: 1, message: "MESSAGE 1"}},
               {:ok, %TrivialHandler.Ok{msgId: 1, message: "MESSAGE 2"}}
             ] = Enum.map(reply_json, &Encoder.Json.decode/1)
    end
  end
end
