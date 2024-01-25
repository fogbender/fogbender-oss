defmodule Fog.Repo.SearchRoom do
  alias Fog.{Data, Repo, Repo.Fts}
  import Ecto.Query
  import Repo
  require Fts
  import Fts, only: [empty_relevance: 0]

  @limit 30
  @term_fields ["rname", "cname"]

  def for_agent(agent_id, params) do
    Repo.Room.with_agent(agent_id)
    |> Repo.Room.with_last_message()
    |> Repo.Room.with_workspace(params[:workspace_id])
    |> with_agent_dialogs(agent_id, params[:workspace_id], params[:type])
    |> with_default_agent_user()
    |> with_room_select()
    |> with_internal_dialog_helpdesk(params[:workspace_id])
    |> with_filters(params)
    |> with_monolog_filter(:agent, agent_id, params[:with_monolog])
    |> with_term_filter(params[:term], params[:term_fields])
    |> with_limit(params[:limit])
    |> Repo.all()
  end

  def for_user(user_id, params) do
    Repo.Room.with_user(user_id)
    |> Repo.Room.with_last_message()
    |> with_user_dialogs(user_id, params[:helpdesk_id], params[:type])
    |> with_default_agent_user()
    |> with_room_select()
    |> with_filters(params)
    |> with_tag_scoping_filter(user_id, params[:helpdesk_id])
    |> with_monolog_filter(:user, user_id, params[:with_monolog])
    |> with_term_filter(params[:term], params[:term_fields])
    |> with_limit(params[:limit])
    |> Repo.all()
  end

  defp with_filters(query, params) do
    from(r in subquery(query), as: :room)
    |> with_type_filter(params[:type])
    |> with_tags_filter(params[:tag_ids] || [], params[:tag_names] || [])
    |> with_mention_room_members_filter(params[:mention_room_id])
  end

  defp with_room_select(query) do
    select_merge(query, [r, user: u, agent: a], %{
      id: type(fragment("coalesce(?, snowflake_id(1))", r.id), Fog.Types.RoomId),
      type: coalesce(r.type, "dialog"),
      name: u.name |> coalesce(a.name) |> coalesce(r.name),
      created: not is_nil(r.id),
      user_id: u.id,
      agent_id: a.id,
      email: coalesce(u.email, a.email),
      image_url: coalesce(u.image_url, a.image_url),
      inserted_at: r.inserted_at |> coalesce(u.inserted_at) |> coalesce(a.inserted_at),
      updated_at: r.updated_at,
      helpdesk_id: coalesce(r.helpdesk_id, u.helpdesk_id)
    })
  end

  defp with_internal_dialog_helpdesk(query, workspace_id) do
    internal = Repo.Helpdesk.get_internal(workspace_id)

    select_merge(query, [r, user: u], %{
      helpdesk_id:
        type(
          r.helpdesk_id |> coalesce(u.helpdesk_id) |> coalesce(^internal.id),
          Fog.Types.HelpdeskId
        )
    })
  end

  defp with_agent_dialogs(q, agent_id, workspace_id, type) when type in [nil, "dialog"] do
    from(r in subquery(q),
      left_join: rm in assoc(r, :members),
      on: r.type == "dialog" and (rm.agent_id != ^agent_id or is_nil(rm.agent_id)),
      full_join: a in subquery(Repo.Agent.with_workspace(workspace_id)),
      on: a.id == rm.agent_id,
      as: :agent,
      full_join: u in subquery(Repo.User.with_workspace(workspace_id)),
      on: u.id == rm.user_id,
      as: :user
    )
  end

  defp with_agent_dialogs(q, _, _, _), do: q

  defp with_user_dialogs(q, user_id, helpdesk_id, type) when type in [nil, "dialog"] do
    from(r in subquery(q),
      left_join: rm in assoc(r, :members),
      on: r.type == "dialog" and (rm.user_id != ^user_id or is_nil(rm.user_id)),
      left_join: a in subquery(Repo.Agent.with_helpdesk(helpdesk_id)),
      on: a.id == rm.agent_id,
      as: :agent,
      full_join: u in subquery(Repo.User.with_helpdesk(helpdesk_id)),
      on: u.id == rm.user_id,
      as: :user
    )
  end

  defp with_user_dialogs(q, _, _, _), do: q

  defp with_default_agent_user(q) do
    q
    |> join_once(:left, [], Data.Agent, on: 1 == 0, as: :agent)
    |> join_once(:left, [], Data.User, on: 1 == 0, as: :user)
  end

  defp with_monolog_filter(q, _, _, true), do: q

  defp with_monolog_filter(q, :agent, agent_id, _) do
    where(q, [r], is_nil(r.agent_id) or r.agent_id != ^agent_id)
  end

  defp with_monolog_filter(q, :user, user_id, _) do
    where(q, [r], is_nil(r.user_id) or r.user_id != ^user_id)
  end

  defp with_type_filter(q, nil), do: q
  defp with_type_filter(q, type), do: where(q, [r], coalesce(r.type, "dialog") == ^type)

  defp with_term_filter(q, nil, _), do: q
  defp with_term_filter(q, "", _), do: q
  defp with_term_filter(q, term, nil), do: with_term_filter(q, term, @term_fields)
  defp with_term_filter(q, term, []), do: with_term_filter(q, term, @term_fields)

  defp with_term_filter(query, term, term_fields) do
    relevance_field =
      ^calc_relevance(term, term_fields)
      |> selected_as(:relevance)
      |> dynamic()

    query
    |> join(:left, [r], assoc(r, :customer), as: :customer)
    |> maybe_join_message(term, term_fields)
    |> select_merge(^%{relevance: relevance_field})
    |> order_by(desc: selected_as(:relevance))
    |> order_by(^[desc: calc_inserted_at(term_fields)])
    |> subquery()
    |> where([r], r.relevance > empty_relevance())
  end

  defp calc_inserted_at(term_fields) do
    if "message" in term_fields or "aname" in term_fields do
      dynamic([r, message: m], coalesce(m.inserted_at, r.inserted_at))
    else
      dynamic([r], r.inserted_at)
    end
  end

  defp maybe_join_message(query, term, term_fields) do
    if "aname" in term_fields or "message" in term_fields do
      mq = subquery(message_query(term, term_fields))

      from(r in query,
        left_lateral_join: m in ^mq,
        on: true,
        as: :message,
        select_merge: %{relevant_message_id: m.id}
      )
    else
      query
    end
  end

  defp message_query(term, term_fields) do
    term_fields = Enum.filter(term_fields, &(&1 in ["message", "aname"]))

    from(
      m in Data.Message,
      where: m.room_id == parent_as(:room).id,
      select: %{id: m.id, inserted_at: m.inserted_at}
    )
    |> message_maybe_join_author(term_fields)
    |> select_merge(
      ^%{
        rel:
          ^message_rel(term_fields, term)
          |> selected_as(:rel)
          |> dynamic()
      }
    )
    |> order_by([m],
      desc: selected_as(:rel),
      desc: m.inserted_at
    )
    |> limit(1)
  end

  defp message_maybe_join_author(query, fields) do
    if "aname" in fields do
      from(m in query,
        left_join: assoc(m, :from_agent),
        as: :agent,
        left_join: assoc(m, :from_user),
        as: :user
      )
    else
      query
    end
  end

  defp message_rel(term_fields, term) do
    text_exp =
      term_fields
      |> Enum.map(fn
        "message" -> dynamic([m], m.text)
        "aname" -> dynamic([user: u, agent: a], coalesce(a.name, u.name))
      end)
      |> Enum.intersperse(" ")
      |> Enum.reduce(fn
        exp, acc -> dynamic([m], concat(^acc, ^exp))
      end)

    Fts.relevance([m], ^text_exp, term)
  end

  def calc_relevance(term, term_fields) do
    fields =
      term_fields
      |> Enum.map(fn
        "aname" -> "message"
        name -> name
      end)
      |> Enum.uniq()
      |> Enum.map(fn
        "rname" -> Fts.relevance([r], r.name, term)
        "cname" -> Fts.relevance([customer: c], c.name, term)
        "message" -> dynamic([message: m], coalesce(m.rel, empty_relevance()))
      end)

    Fts.combine_relevance(fields)
  end

  def calc_is_similar(term, term_fields) do
    Enum.reduce(term_fields, false, fn
      "rname", acc ->
        dynamic([r], ^acc or Fts.is_similar(r.name, ^term))

      "cname", acc ->
        dynamic([customer: c], ^acc or Fts.is_similar(c.name, ^term))

      "message", acc ->
        dynamic([message: m], ^acc or Fts.is_similar(m.text, ^term))

      "aname", acc ->
        dynamic(
          [message_agent: ma, message_user: mu],
          ^acc or Fts.is_similar(coalesce(ma.name, mu.name), ^term)
        )
    end)
  end

  defp with_limit(q, limit) do
    limit = limit || @limit
    limit(q, ^limit)
  end

  defp with_tags_filter(q, [], []), do: q

  defp with_tags_filter(q, tag_ids, tag_names) do
    from(r in q,
      where:
        exists(
          from(rt in Data.RoomTag,
            join: t in assoc(rt, :tag),
            where:
              rt.room_id == parent_as(:room).id and
                (rt.tag_id in ^tag_ids or t.name in ^tag_names)
          )
        )
    )
  end

  defp with_mention_room_members_filter(q, nil), do: q

  defp with_mention_room_members_filter(q, mention_room_id) do
    from(r in q,
      join: mr in Data.Room,
      on: mr.id == ^mention_room_id,
      left_join: members in subquery(Repo.RoomMembership.with_room(mention_room_id)),
      on: members.agent_id == r.agent_id or members.user_id == r.user_id,
      where: r.type == "dialog",
      where: not is_nil(r.agent_id) or r.helpdesk_id == mr.helpdesk_id,
      where: mr.type == "public" or not is_nil(members.agent_id) or not is_nil(members.user_id)
    )
  end

  defp with_tag_scoping_filter(q, user_id, helpdesk_id) do
    case "User Tag Scoping" in Repo.Helpdesk.flags(helpdesk_id) do
      true ->
        from(r in q,
          where:
            not exists(from(rt in Data.RoomTag, where: parent_as(:room).id == rt.room_id)) or
              exists(
                from(rt in Data.RoomTag,
                  join: ru in ^Repo.Tag.with_user(user_id),
                  on: ru.tag_id == rt.tag_id,
                  where: rt.room_id == parent_as(:room).id
                )
              )
        )

      false ->
        q
    end
  end
end
