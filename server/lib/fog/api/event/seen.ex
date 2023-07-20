defmodule Fog.Api.Event.Seen do
  alias Fog.{Repo, Data, PubSub}
  alias Fog.Repo.Query
  alias Fog.Api.Event.Seen

  defstruct [
    :msgType,
    :msgId,
    :roomId,
    :messageId
  ]

  def load_inserted(ctx, _opts, _sess), do: load(ctx)
  def load_updated(ctx, _opts, _sess), do: load(ctx)

  def load(ctx) do
    Data.Seen
    |> Query.with_ctx(ctx)
    |> Repo.all()
    |> Enum.map(&from_data/1)
  end

  def publish(%Data.Seen{} = s) do
    e = from_data(s)

    for t <- topics(s), do: PubSub.publish(t, e)

    Fog.Api.Event.Badge.load_all(s)
    |> Enum.map(&(:ok = Fog.Api.Event.Badge.publish(&1)))

    :ok
  end

  defp topics(%Data.Seen{agent_id: agent_id}) when agent_id != nil do
    [
      "agent/#{agent_id}/seen"
    ]
  end

  defp topics(%Data.Seen{user_id: user_id}) when user_id != nil do
    [
      "user/#{user_id}/seen"
    ]
  end

  defp from_data(%Data.Seen{} = s) do
    %Seen{
      roomId: s.room_id,
      messageId: s.message_id
    }
  end
end
