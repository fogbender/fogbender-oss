defmodule Fog.Api.Ping do
  use Fog.Api.Handler
  alias Fog.Api.Session
  alias Fog.{Repo, Utils}

  defmsg(Ping, [:lastActivityTs])
  defmsg(Pong, [])

  def info(c, s), do: info(c, s, [])

  def info(%Ping{} = p, s, _) do
    s = update_last_activity(p, s)
    {:reply, %Pong{}, s}
  end

  def info(_, _, _), do: :skip

  defp update_last_activity(_, %Session.Guest{} = s), do: s

  defp update_last_activity(%Ping{lastActivityTs: ts}, s) when is_integer(ts) do
    case s do
      %Session.User{userId: uid, lastActivityTs: ts0} when ts0 < ts ->
        Repo.User.update_last_activity(uid, Utils.from_unix(ts))
        %Session.User{s | lastActivityTs: ts}

      %Session.Agent{vendorId: vid, agentId: aid, lastActivityTs: ts0} when ts0 < ts ->
        Repo.Agent.update_last_activity(vid, aid, Utils.from_unix(ts))
        %Session.Agent{s | lastActivityTs: ts}

      _ ->
        s
    end
  end

  defp update_last_activity(_p, s), do: s
end
