defmodule Fog.Api.Perm.Helpers do
  alias Fog.Repo
  alias Fog.Api.Session

  def guest(%Session.Guest{}), do: true
  def guest(_), do: false

  def agent(%Session.Agent{}), do: true
  def agent(_), do: false

  def user(%Session.User{}), do: true
  def user(_), do: false

  def user(%Session.User{userId: id}, "h" <> _ = ctx), do: Repo.Helpdesk.has_user?(ctx, id)
  def user(%Session.User{userId: id}, "r" <> _ = ctx), do: Repo.Room.has_helpdesk_user(ctx, id)
  def user(_, _), do: false

  def owner(%Session.Agent{agentId: id}, ctx), do: agent_role(id, ctx, ["owner"])
  def owner(_, _), do: false

  def admin(%Session.Agent{agentId: id}, ctx), do: agent_role(id, ctx, ["owner", "admin"])
  def admin(_, _), do: false

  def agent(%Session.Agent{agentId: id}, ctx),
    do: agent_role(id, ctx, ["owner", "admin", "agent"])

  def agent(_, _), do: false

  def reader(%Session.Agent{agentId: id}, ctx),
    do: agent_role(id, ctx, ["owner", "admin", "agent", "reader"])

  def reader(_, _), do: false

  def app(%Session.Agent{agentId: id}, ctx),
    do: agent_role(id, ctx, ["app", "assistant"])

  def app(_, _), do: false

  def member(%Session.User{userId: id}, "r" <> _ = rid), do: Repo.Room.has_user_member(rid, id)

  def member(%Session.Agent{agentId: id}, "r" <> _ = rid),
    do: Repo.Room.has_agent_member(rid, id) or Repo.Room.has_agent_group(rid, id)

  def member(_, _), do: false

  def room_type(rid), do: Repo.Room.get(rid, :type)

  def internal_room?(rid), do: Repo.Room.internal?(rid)

  def internal_helpdesk?(hid), do: Repo.Helpdesk.internal?(hid)

  def flag("w" <> _ = ctx, flag), do: flag in Repo.Workspace.flags(ctx)
  def flag("h" <> _ = ctx, flag), do: flag in Repo.Helpdesk.flags(ctx)
  def flag("r" <> _ = ctx, flag), do: flag in Repo.Room.flags(ctx)

  def tags("r" <> _ = ctx), do: Repo.Room.tags(ctx)
  def tags("a" <> _ = ctx), do: Repo.Agent.tags(ctx)
  def tags("u" <> _ = ctx), do: Repo.User.tags(ctx)

  def author(s, message_id), do: actor_id(s) == Repo.Message.author(message_id)

  def message_room(message_id), do: Repo.Message.get(message_id, :room_id)

  def actor_id(sess), do: Session.actor_id(sess)

  def intersect(l1, l2) do
    ms1 = MapSet.new(l1)
    ms2 = MapSet.new(l2)

    MapSet.intersection(ms1, ms2)
    |> MapSet.to_list()
  end

  def tagged(s, room_id) do
    room_tags = tags(room_id)

    case room_tags do
      [] -> true
      _ -> intersect(room_tags, tags(actor_id(s))) != []
    end
  end

  def tag_type(":@" <> tag) do
    [owner_id | _] = String.split(tag, ":")
    {:personal, owner_id}
  end

  def tag_type(":" <> _), do: :system
  def tag_type("#" <> _), do: :public
  # TODO Remove on TeamedUp close
  def tag_type(_), do: :public

  def tag_kind(":@" <> tag) do
    [owner_id, kind | _] = String.split(tag, ":")
    {:personal, owner_id, kind}
  end

  def tag_kind(<<p::utf8, tag::binary>>) do
    type =
      case p do
        ":" -> :system
        "#" -> :public
        # TODO Remove on TeamedUp close
        _ -> :public
      end

    [kind | _] = String.split(tag, ":")
    {type, kind}
  end

  defp agent_role(id, "v" <> _ = vid, roles), do: Repo.Vendor.agent_role(vid, id) in roles
  defp agent_role(id, "w" <> _ = wid, roles), do: Repo.Workspace.agent_role(wid, id) in roles
  defp agent_role(id, "h" <> _ = hid, roles), do: Repo.Helpdesk.agent_role(hid, id) in roles
  defp agent_role(id, "r" <> _ = rid, roles), do: Repo.Room.agent_role(rid, id) in roles
end
