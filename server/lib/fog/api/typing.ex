defmodule Fog.Api.Typing do
  use Fog.Api.Handler
  alias Fog.{Repo}
  alias Fog.Api.{Session, Event, Perm}

  defmsg(Set, [:roomId])
  deferr(SetErr)

  def info(c, s), do: info(c, s, [])

  def info(%Set{roomId: room_id}, sess, _) do
    case Perm.Room.allowed?(sess, :read, room_id: room_id) do
      true ->
        room = Repo.Room.get(room_id)

        %{id: id, name: name} = get_from(sess)

        Event.Typing.set(room, id, name)

        ref = Process.send_after(self(), {:reset_typing, room_id}, 1_300)

        case typing_ref(sess) do
          :undefined ->
            :ok

          prev_ref ->
            Process.cancel_timer(prev_ref)
        end

        {:ok, %{sess | typing_ref: ref}}

      false ->
        {:reply, SetErr.forbidden()}
    end
  end

  def info({:reset_typing, room_id}, sess, _) do
    room = Repo.Room.get(room_id)
    Event.Typing.reset(room)
    {:ok, %{sess | typing_ref: :undefined}}
  end

  def info(_, _, _), do: :skip

  defp typing_ref(%{:typing_ref => typing_ref}) do
    typing_ref
  end

  defp get_from(%Session.User{userId: user_id}) do
    u = Fog.Data.User |> Fog.Repo.get(user_id)
    %{type: "user", id: user_id, name: u.name}
  end

  defp get_from(%Session.Agent{agentId: agent_id}) do
    a = Fog.Data.Agent |> Fog.Repo.get(agent_id)
    %{type: "agent", id: agent_id, name: a.name}
  end
end
