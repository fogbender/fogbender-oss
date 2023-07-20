defmodule Fog.Api.Error do
  use Fog.Api.Handler

  deferr(Fatal, [:data])
  defmsg(InvalidMsgType)
end
