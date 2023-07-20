defmodule Fog.Repo.Room do
  import Ecto.Query, only: [from: 2]
  alias Fog.{Data, Repo}

  def get(id), do: Data.Room |> Repo.get(id)

  def get(id, f) when is_atom(f) do
    from(r in Data.Room,
      select: field(r, ^f),
      where: r.id == ^id
    )
    |> Repo.one()
  end

  def tags(rid) do
    from(rt in Data.RoomTag,
      where: rt.room_id == ^rid,
      select: rt.tag_id
    )
    |> Repo.all()
  end

  def has_helpdesk_user(rid, uid) do
    from(r in Data.Room,
      join: h in assoc(r, :helpdesk),
      join: u in assoc(h, :users),
      where: r.id == ^rid and u.id == ^uid
    )
    |> Repo.exists?()
  end

  def has_agent_group(rid, aid) do
    from(
      r in Data.Room,
      join: v in assoc(r, :vendor),
      join: ag in Data.VendorAgentGroup,
      on: ag.vendor_id == v.id and ag.agent_id == ^aid,
      where: r.id == ^rid and ag.group in r.agent_groups
    )
    |> Repo.exists?()
  end

  def has_agent_member(rid, aid) do
    from(rm in Data.RoomMembership,
      where: rm.room_id == ^rid and rm.agent_id == ^aid
    )
    |> Repo.exists?()
  end

  def has_user_member(rid, uid) do
    from(rm in Data.RoomMembership,
      where: rm.room_id == ^rid and rm.user_id == ^uid
    )
    |> Repo.exists?()
  end

  def agent_role(rid, aid) do
    from(av in Data.VendorAgentRole,
      join: v in assoc(av, :vendor),
      join: w in assoc(v, :workspaces),
      join: h in assoc(w, :helpdesks),
      join: r in assoc(h, :rooms),
      where: r.id == ^rid and av.agent_id == ^aid,
      select: av.role
    )
    |> Repo.one()
  end

  def flags(rid) do
    from(r in Data.Room,
      join: w in assoc(r, :workspace),
      join: wf in assoc(w, :feature_flags),
      where: r.id == ^rid,
      select: wf.feature_flag_id
    )
    |> Repo.all()
  end

  defp dialog_id(hid, members) do
    [m1, m2] = Enum.sort(members)
    "#{hid}-#{m1}-#{m2}"
  end

  def create_dialog([member1, member2] = members, params) do
    dialog_id = dialog_id(params[:helpdesk_id], members)

    params =
      Map.merge(params |> Enum.into(%{}), %{
        type: "dialog",
        dialog_id: dialog_id,
        name: "#{Ecto.UUID.generate()}",
        members: [
          %{
            helpdesk_id: params[:helpdesk_id],
            agent_id: agent_id(member1),
            user_id: user_id(member1),
            role: "member",
            status: "active"
          },
          %{
            helpdesk_id: params[:helpdesk_id],
            agent_id: agent_id(member2),
            user_id: user_id(member2),
            role: "member",
            status: "active"
          }
        ]
      })

    room =
      try do
        {:ok, r} =
          Data.Room.new(params)
          |> Repo.insert()

        r
      rescue
        _e in [Ecto.ConstraintError] ->
          Repo.get_by(Data.Room, dialog_id: dialog_id)
      end

    room
  end

  def create_private(wid, members, params) do
    params =
      Map.merge(params |> Enum.into(%{}), %{
        type: "private",
        members:
          members
          |> Enum.map(
            &%{
              helpdesk_id: params[:helpdesk_id],
              agent_id: agent_id(&1),
              user_id: user_id(&1),
              role: "member",
              status: "active"
            }
          )
      })

    params = params |> maybe_default_assignment_tag(wid) |> maybe_tags()
    do_create(params)
  end

  def create_private(wid, members, agent_groups, params) when is_list(agent_groups) do
    params =
      Map.merge(params, %{
        type: "private",
        agent_groups: agent_groups,
        members:
          members
          |> Enum.map(
            &%{
              helpdesk_id: params.helpdesk_id,
              agent_id: agent_id(&1),
              user_id: user_id(&1),
              role: "member",
              status: "active"
            }
          )
      })

    params = params |> maybe_default_assignment_tag(wid) |> maybe_tags()
    do_create(params)
  end

  def create(wid, params) do
    params = Enum.into(params, %{}) |> maybe_default_assignment_tag(wid) |> maybe_tags()
    do_create(params)
  end

  defp do_create(params) do
    Data.Room.new(params)
    |> Repo.insert!()
  end

  def update(id, params) do
    Data.Room
    |> Repo.get(id)
    |> Data.Room.update(params)
    |> Repo.update!()
  end

  def resolve(id, status, agent_id, til \\ nil) do
    update(id,
      resolved: status,
      resolved_at: DateTime.utc_now(),
      resolved_by_agent_id: agent_id,
      resolved_til: til
    )
  end

  def unresolve_timeouted(timestamp) do
    from(r in Data.Room,
      where: r.resolved == true,
      where: not is_nil(r.resolved_til) and r.resolved_til < ^timestamp,
      select: r
    )
    |> Repo.update_all(set: [resolved: false])
  end

  def update_tags(id, tag_ids_to_add, tag_ids_to_remove, updated_by_agent_id, updated_by_user_id) do
    room = Repo.Room.get(id) |> Repo.preload(:tags)

    remaining =
      room.tags
      |> Enum.reject(&Enum.member?(tag_ids_to_remove, &1.tag_id))

    remaining =
      remaining
      |> Enum.map(
        &%{
          id: &1.id,
          tag_id: &1.tag_id,
          room_id: &1.room_id,
          updated_by_agent_id: &1.updated_by_agent_id,
          updated_by_user_id: &1.updated_by_user_id
        }
      )

    new =
      tag_ids_to_add
      |> Enum.map(
        &%{
          room_id: id,
          tag_id: &1,
          updated_by_agent_id: updated_by_agent_id,
          updated_by_user_id: updated_by_user_id
        }
      )

    tags = (remaining ++ new) |> Enum.uniq_by(& &1.tag_id)

    room
    |> Data.Room.update(%{tags: tags})
    |> Repo.update!()
  end

  def update_members(id, members_to_add, members_to_remove) do
    room = Repo.Room.get(id) |> Repo.preload(:members)
    hid = room.helpdesk_id

    members =
      room.members
      |> Enum.reject(
        &(Enum.member?(members_to_remove, &1.agent_id) or
            Enum.member?(members_to_remove, &1.user_id))
      )

    members =
      members
      |> Enum.map(
        &%{
          id: &1.id,
          room_id: id,
          helpdesk_id: hid,
          agent_id: agent_id(&1.agent_id),
          user_id: user_id(&1.user_id),
          role: "member",
          status: "active"
        }
      )

    new =
      members_to_add
      |> Enum.map(
        &%{
          room_id: id,
          helpdesk_id: hid,
          agent_id: agent_id(&1),
          user_id: user_id(&1),
          role: "member",
          status: "active"
        }
      )

    members = members ++ new

    room
    |> Data.Room.update(%{members: members})
    |> Repo.update!()
  end

  def update_name(id, room_name) do
    room = Repo.Room.get(id)

    room
    |> Data.Room.update(%{name: room_name})
    |> Repo.update!()
  end

  def delete(id) do
    Data.Room
    |> Repo.get(id)
    |> Repo.delete!()
  end

  def internal?(%Data.Customer{name: name}) do
    case name do
      "$Cust_Internal_" <> _ -> true
      _ -> false
    end
  end

  def internal?(id) do
    room =
      Data.Room
      |> Repo.get(id)
      |> Repo.preload([:customer])

    internal?(room.customer)
  end

  def messages_slice(room_id, start_message_id, end_message_id) do
    from(
      m in Data.Message,
      where:
        m.room_id == ^room_id and m.id >= ^start_message_id and
          m.id <= ^end_message_id
    )
    |> Fog.Repo.all()
  end

  def with_agent(q \\ Data.Room, agent_id) do
    from(r in q,
      join: v in assoc(r, :vendor),
      join: va in assoc(v, :agents),
      on: va.agent_id == ^agent_id,
      left_join: rm in assoc(r, :members),
      on: rm.agent_id == ^agent_id,
      left_join:
        ag in subquery(
          from(
            ag in Data.VendorAgentGroup,
            where: ag.agent_id == ^agent_id,
            group_by: ag.vendor_id,
            select: %{vendor_id: ag.vendor_id, agent_groups: fragment("array_agg(?)", ag.group)}
          )
        ),
      on: ag.vendor_id == v.id and fragment("? && (?)::text[]", ag.agent_groups, r.agent_groups),
      where:
        r.type == "public" or
          not is_nil(rm.agent_id) or
          not is_nil(ag.vendor_id)
    )
  end

  def with_user(q \\ Data.Room, user_id) do
    from(r in q,
      join: u in Data.User,
      on: u.id == ^user_id and r.helpdesk_id == u.helpdesk_id,
      left_join: rm in assoc(r, :members),
      on: rm.user_id == ^user_id,
      where: r.type == "public" or not is_nil(rm.user_id)
    )
  end

  def with_workspace(q \\ Data.Room, workspace_id) do
    from(r in q,
      join: h in assoc(r, :helpdesk),
      where: h.workspace_id == ^workspace_id
    )
  end

  def with_last_message(query \\ Data.Room) do
    from(r in query,
      left_join:
        m in subquery(
          from(m in Data.Message,
            select: %{id: max(m.id), room_id: m.room_id},
            group_by: m.room_id
          )
        ),
      on: m.room_id == r.id,
      select_merge: %{last_message_id: m.id}
    )
  end

  defp maybe_tags(params) do
    case Map.has_key?(params, :tags) and is_list(params.tags) do
      true ->
        Map.merge(params, %{
          tags:
            params.tags
            |> Enum.map(
              &%{
                tag_id: &1
              }
            )
        })

      false ->
        {_, params} = Map.pop(params, :tags)
        params
    end
  end

  defp maybe_default_assignment_tag(params, wid) do
    hid = params.helpdesk_id

    case Repo.Helpdesk.internal?(hid) do
      true ->
        params

      false ->
        case Repo.FeatureOption.get(Repo.Workspace.get(wid)).default_group_assignment do
          nil ->
            params

          group_name ->
            tag_name = ":assignee:group:#{group_name}"
            tag = Repo.Tag.create(wid, tag_name)
            tag_ids = params |> Map.get(:tags, [])

            Map.merge(params, %{
              tags: [tag.id | tag_ids]
            })
        end
    end
  end

  defp agent_id(<<"a", _::binary>> = id), do: id
  defp agent_id(_), do: nil

  defp user_id(<<"u", _::binary>> = id), do: id
  defp user_id(_), do: nil
end
