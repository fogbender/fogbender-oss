defmodule Fog.Api.AgentNameOverride do
  use Fog.Api.Handler
  alias Fog.Api.{Session, Event}

  def info(message, %Session.User{agent_name_override_enabled: true, agent_name_override: name} = s) do
    {:next, override_agent_name(message, name), s}
  end

  def info(_, _), do: :skip

  def override_agent_name(%Event.Agent{} = a, name), do: %Event.Agent{a | name: name}
  def override_agent_name(%Event.Badge{} = b, name) do
    %Event.Badge{b |
        firstUnreadMessage: override_agent_name(b.firstUnreadMessage, name),
        lastRoomMessage: override_agent_name(b.lastRoomMessage, name),
        nextMentionMessage: override_agent_name(b.nextMentionMessage, name)
    }
  end
  def override_agent_name(%Event.Message{} = m, name) do
    m
    |> override_message_author_name(name)
    |> override_mention_name(name)
  end
  def override_agent_name(%Event.Room{members: members} = r, name) do
    members = Enum.map(members,
      fn(%{type: "agent"} = member) -> %{member | name: name, email: "", imageUrl: ""}
        (member) -> member
      end)
    %Event.Room{r | members: members}
  end
  def override_agent_name(%Event.RosterRoom{} = r, name) do
    %Event.RosterRoom{r |
      room: override_agent_name(r.room, name),
      badge: override_agent_name(r.badge, name)
    }
  end
  def override_agent_name(%Event.Typing{data: data} = t, name) do
    data = Enum.map(data,
      fn (%{id: "a" <> _} = agent) -> %{agent | name: name}
         (user) -> user
      end)
    %Event.Typing{t | data: data}
  end
  def override_agent_name(message, _), do: message

  defp override_message_author_name(%Event.Message{fromType: "agent"} = m, name) do
    %Event.Message{m | fromName: name}
  end
  defp override_message_author_name(m, _), do: m

  defp override_mention_name(%Event.Message{mentions: mentions} = m, name) when is_list(mentions) do
    mentions = Enum.map(mentions,
      fn(%{type: "agent"} = mention) -> %{mention| name: name, text: name}
        (mention) -> mention
      end)
    %Event.Message{m | mentions: mentions }
  end

end
