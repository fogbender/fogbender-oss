defmodule Fog.Api.User do
  use Fog.Api.Handler

  alias Fog.{Repo}
  alias Fog.Api.{Event, Perm}

  defmsg(Update, [
    :userId,
    :imageUrl
  ])

  @commands [Update]

  defmsg(Ok, [:userId])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    if auth(m, s) do
      user = handle_command(m, s)
      :ok = Event.publish(user)
      {:reply, %Ok{userId: user.id}}
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp auth(%Update{userId: user_id}, sess) do
    Perm.User.allowed?(sess, :update, user_id: user_id)
  end

  defp handle_command(%Update{userId: user_id, imageUrl: image_url}, _) do
    Repo.User.update(user_id, image_url: image_url)
  end
end
