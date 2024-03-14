defmodule Fog.RepoCaseUtils do
  alias Fog.{Repo, Data}
  import Ecto.Query

  def id(), do: Snowflake.next_id() |> elem(1)

  def agent(data, role \\ "owner", name \\ nil)

  def agent(%Data.Workspace{} = w, role, name) do
    id = id()

    Data.Agent.new(
      id: id,
      name: name || "agent #{id}",
      email: "agent#{id}@example.com",
      vendors: [%{agent_id: id, vendor_id: w.vendor_id, role: role}],
      workspaces: [%{agent_id: id, workspace_id: w.id, role: "admin"}],
      groups: [%{agent_id: id, vendor_id: w.vendor_id, group: "all"}]
    )
    |> Repo.insert!()
  end

  def agent(%Data.Vendor{} = v, role, name) do
    id = id()

    Data.Agent.new(
      id: id,
      name: name || "agent #{id}",
      email: "agent#{id}@example.com",
      vendors: [%{agent_id: id, vendor_id: v.id, role: role}],
      groups: [%{agent_id: id, vendor_id: v.id, group: "all"}]
    )
    |> Repo.insert!()
  end

  def agents(c, v) do
    for _ <- 1..c, do: agent(v)
  end

  def user(h, name \\ nil) do
    id = id()

    Data.User.new(
      id: id,
      name: (name || "user #{id}"),
      email: (name || "user") <> "#{id}@example.com",
      helpdesk_id: h.id
    )
    |> Repo.insert!()
  end

  def users(c, h, prefix \\ nil) do
    for _ <- 1..c, do: user(h, prefix)
  end

  def vendor(agents \\ []) do
    id = id()

    Data.Vendor.new(
      id: id,
      name: "vendor #{id}",
      agents:
        for a <- agents do
          %{vendor_id: id, agent_id: a.id, role: "owner"}
        end,
      groups:
        for a <- agents do
          %{vendor_id: id, agent_id: a.id, group: "all"}
        end
    )
    |> Repo.insert!()
  end

  def group(vendor, agent, name) do
    Data.VendorAgentGroup.new(
      vendor_id: vendor.id,
      agent_id: agent.id,
      group: name
    )
    |> Repo.insert!()
  end

  def room_group(room, name) do
    Data.Room.update(room, agent_groups: [name | room.agent_groups || []])
    |> Repo.update!()
  end

  def workspace(v, agents \\ []) do
    id = id()

    Data.Workspace.new(
      id: id,
      name: "workspace #{id}",
      vendor_id: v.id,
      signature_type: "jwt",
      signature_secret: Fog.UserSignature.generate_192bit_secret(),
      agents:
        for a <- agents do
          %{workspace_id: id, agent_id: a.id, role: "admin"}
        end
    )
    |> Repo.insert!()
    |> Repo.preload(:vendor)
  end

  def customer(v, internal \\ false, exuid \\ nil, name \\ nil) do
    id = id()

    name =
      name ||
        if internal do
          "$Cust_Internal_#{id}"
        else
          "customer #{id}"
        end

    Data.Customer.new(
      id: id,
      name: name,
      vendor_id: v.id,
      external_uid: exuid || "ex#{id}"
    )
    |> Repo.insert!()
  end

  def helpdesk(w, internal \\ false) do
    id = id()
    c = customer(w.vendor, internal)

    Data.Helpdesk.new(
      id: id,
      workspace_id: w.id,
      customer_id: c.id
    )
    |> Repo.insert!()
  end

  def customer_helpdesk(w, %Data.Customer{} = c) do
    Data.Helpdesk.new(
      workspace_id: w.id,
      customer_id: c.id
    )
    |> Repo.insert!()
  end

  def customer_helpdesk(w, cname) when is_binary(cname) do
    c = customer(w.vendor, false, nil, cname)
    customer_helpdesk(w, c)
  end

  def internal_helpdesk(w), do: helpdesk(w, true)

  def room(h, "dialog", members, _) do
    member_ids = members |> Enum.map(& &1.id)

    Repo.Room.create_dialog(
      member_ids,
      helpdesk_id: h.id
    )
  end

  def room(h, "private", members, name) do
    id = id()
    name = name || "private room #{id}"

    member_ids = members |> Enum.map(& &1.id)

    Repo.Room.create_private(
      h.workspace_id,
      member_ids,
      %{
        helpdesk_id: h.id,
        name: name
      }
    )
  end

  def room(h, "public", _, name) do
    id = id()
    name = name || "public room #{id}"

    Repo.Room.create(
      h.workspace_id,
      helpdesk_id: h.id,
      name: name,
      type: "public"
    )
  end

  def room(h, "triage", _, name) do
    name = name || "triage"

    Repo.Room.create(
      h.workspace_id,
      helpdesk_id: h.id,
      name: name,
      type: "public",
      is_triage: true
    )
  end

  def public_room(h, name \\ nil), do: room(h, "public", [], name)
  def private_room(h, members, name \\ nil), do: room(h, "private", members, name)
  def dialog_room(h, members, name \\ nil), do: room(h, "dialog", members, name)
  def triage_room(h, name \\ nil), do: room(h, "triage", [], name)

  def tag(e, tags) when is_list(tags), do: Enum.map(tags, fn t -> tag(e, t) end)
  def tag(%Data.Workspace{} = w, name), do: Fog.Repo.Tag.create(w.id, name)

  def tag(%Data.User{} = u, %Data.Tag{} = t) do
    Data.AuthorTag.new(user_id: u.id, tag_id: t.id)
    |> Repo.insert!()
  end

  def tag(%Data.Agent{} = a, %Data.Tag{} = t) do
    Data.AuthorTag.new(agent_id: a.id, tag_id: t.id)
    |> Repo.insert!()
  end

  def tag(%Data.Room{} = r, %Data.Tag{} = t) do
    Data.RoomTag.new(room_id: r.id, tag_id: t.id)
    |> Repo.insert!()
  end

  def untag(%Data.Room{} = r, %Data.Tag{} = t) do
    Repo.get_by(Data.RoomTag, room_id: r.id, tag_id: t.id)
    |> Repo.delete!()
  end

  def flag(name) do
    Data.FeatureFlag.new(id: name) |> Repo.insert!()
  end

  def flag(%Data.Workspace{} = w, flag) do
    Data.WorkspaceFeatureFlag.new(workspace_id: w.id, feature_flag_id: flag.id) |> Repo.insert!()
  end

  def seen(actor, room, message, is_following \\ true)

  def seen(%Data.User{} = u, room, message, is_following) do
    Data.Seen.new(
      user_id: u.id,
      room_id: room.id,
      message_id: message.id,
      is_following: is_following
    )
    |> Repo.insert!()
  end

  def seen(%Data.Agent{} = a, room, message, is_following) do
    Data.Seen.new(
      agent_id: a.id,
      room_id: room.id,
      message_id: message.id,
      is_following: is_following
    )
    |> Repo.insert!()
  end

  def message(room, author, text \\ nil, mentions \\ []) do
    params =
      [
        room_id: room.id,
        text: text,
        mentions: process_mentions(mentions)
      ] ++ from_author(author)

    Repo.Message.create(params)
  end

  defp process_mentions(mentions) do
    mentions
    |> Enum.map(fn
      %Data.User{id: id, name: name} -> %{user_id: id, text: name}
      %Data.Agent{id: id, name: name} -> %{agent_id: id, text: name}
    end)
  end

  def forward(room, author, messages, text \\ "forward"),
    do: linked_message(room, author, messages, text, "forward")

  def reply(room, author, messages, text \\ "reply"),
    do: linked_message(room, author, messages, text, "reply")

  def linked_message(room, author, messages, text, type) do
    {from_user_id, from_agent_id} =
      case author do
        %Data.User{id: id} -> {id, nil}
        %Data.Agent{id: id} -> {nil, id}
      end

    {:ok, m, _sources} =
      Repo.Message.create(
        room.id,
        text,
        nil,
        [],
        List.first(messages).room_id,
        List.first(messages).id,
        List.last(messages).id,
        type,
        [],
        from_user_id,
        from_agent_id,
        # from_name_override
        nil,
        # from_image_url_override
        nil,
        # source
        nil
      )

    m
  end

  def integration(%Data.Workspace{} = w, type, project_id, specifics \\ %{}) do
    {:ok, integration, _bot} = Repo.Integration.add(w, type, project_id, specifics)
    integration
  end

  def update_raw(%data{id: id}, set) do
    data
    |> where(id: ^id)
    |> Repo.update_all(set: set)
  end

  def archive(room) do
    Repo.Room.update(
      room.id,
      status: "archived"
    )
  end

  def delete_user(user_id, deleted_by_agent_id) do
    Repo.User.get(user_id)
    |> Data.User.update(
      deleted_at: DateTime.utc_now(),
      deleted_by_agent_id: deleted_by_agent_id
    )
    |> Repo.update!()
  end

  def agent_schedule(
        vendor: v,
        agent: a,
        start_time: start_time,
        finish_time: finish_time,
        day: day,
        week: week,
        month: month,
        available: available
      ) do
    Data.AgentSchedule.new(
      vendor_id: v.id,
      agent_id: a.id,
      start_time: start_time,
      finish_time: finish_time,
      day: day,
      week: week,
      month: month,
      available: available
    )
    |> Repo.insert!()
  end

  defp from_author(%Data.User{id: id}), do: [from_user_id: id]
  defp from_author(%Data.Agent{id: id}), do: [from_agent_id: id]
  defp from_author(_), do: nil
end
