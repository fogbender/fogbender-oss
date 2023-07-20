defmodule Fog.PubSub do
  require Logger

  def join(key, meta \\ :undefined) do
    :ok = :syn.join(key, self(), meta)
  end

  def leave(key) do
    case :syn.leave(key, self()) do
      :ok -> :ok
      {:error, :not_in_group} -> :not_joined
    end
  end

  def meta(key) do
    :syn.get_members(key, :with_meta) |> Enum.map(fn {_, m} -> m end)
  end

  def publish(key, message) do
    Logger.debug("Publish to #{key}")
    {:ok, _} = :syn.publish(key, message)
    :ok
  end
end
