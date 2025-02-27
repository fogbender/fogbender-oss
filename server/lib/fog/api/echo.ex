defmodule Fog.Api.Echo do
  use Fog.Api.Handler

  defmsg(Get, [:message])
  defmsg(Ok, [:message])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%Get{message: ""}, _session, _pipeline_replies),
    do: {:reply, %Err{code: 400, error: "Message should not be empty"}}

  def info(%Get{message: m}, _session, _pipeline_replies),
    do: {:reply, %Ok{message: "ECHO: " <> m}}

  def info(_, _, _), do: :skip
end
