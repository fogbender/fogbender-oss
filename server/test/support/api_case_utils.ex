defmodule Fog.ApiCaseUtils do
  def sub(topic) do
    owner = self()

    spawn_link(fn ->
      Fog.PubSub.join(topic)
      sub_loop(owner, topic)
    end)
  end

  defp sub_loop(owner, topic) do
    receive do
      :stop -> :ok
      data -> send(owner, {self(), topic, data})
    end

    sub_loop(owner, topic)
  end

  def unsub(pid), do: send(pid, :stop)
end
