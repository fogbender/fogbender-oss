defmodule Fog.Api.Event.Typing do
  alias Fog.{Data, PubSub}
  alias Fog.Api.Event.Typing

  defstruct [
    :msgType,
    :msgId,
    :roomId,
    :data
  ]

  def typing(%Data.Room{} = r) do
    topic(r)
    |> PubSub.meta()
    |> Enum.reduce([], fn
      %{:typing => typing}, acc -> [typing | acc]
      :undefined, acc -> acc
    end)
  end

  def load_inserted(r, _, _), do: [load(r)]
  def load_updated(r, _, _), do: [load(r)]

  def load(%Data.Room{} = r) do
    %Typing{data: typing(r), roomId: r.id}
  end

  def topic(%Data.Room{} = r) do
    "room/#{r.id}/typing"
  end

  def set(room, userId, userName) do
    PubSub.join(topic(room), %{typing: %{id: userId, name: userName}})
    publish(room)
  end

  def reset(room) do
    PubSub.join(topic(room))
    publish(room)
  end

  def publish(%Data.Room{} = r) do
    PubSub.publish(topic(r), load(r))
    :ok
  end
end
