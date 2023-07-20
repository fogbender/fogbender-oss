defmodule Fog.Notify.ResolvedTimerJob do
  alias Fog.{Repo, Api}

  def run(ts \\ nil) do
    ts = ts || DateTime.utc_now()
    {_, rooms} = Repo.Room.unresolve_timeouted(ts)
    Api.Event.publish_all(rooms)
    :ok
  end
end
