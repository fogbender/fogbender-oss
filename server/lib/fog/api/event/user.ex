defmodule Fog.Api.Event.User do
  alias Fog.{Repo, Data, PubSub, Utils}
  alias Fog.Repo.Query
  alias Fog.Api.Event.User

  defstruct [
    :msgType,
    :msgId,
    :userId,
    :imageUrl,
    :email,
    :name,
    :helpdeskId,
    :createdTs
  ]

  def load_inserted(%Data.Helpdesk{} = ctx, opts, _sess) do
    Data.User
    |> Query.with_ctx(ctx)
    |> Query.inserted(opts)
    |> Repo.all()
    |> Enum.map(&from_data/1)
  end

  def publish(%Data.User{} = u) do
    u = u |> Repo.preload(helpdesk: :workspace)
    e = from_data(u)

    for t <- topics(u), do: PubSub.publish(t, e)

    :ok
  end

  defp topics(u) do
    [
      "helpdesk/#{u.helpdesk.id}/users",
      "workspace/#{u.helpdesk.workspace.id}/users"
    ]
  end

  def from_data(%Data.User{} = u) do
    %User{
      userId: u.id,
      imageUrl: u.image_url,
      name: u.name,
      email: u.email,
      helpdeskId: u.helpdesk_id,
      createdTs: u.inserted_at |> Utils.to_unix()
    }
  end
end
