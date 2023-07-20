defmodule Fog.Repo.Badge do
  import Ecto.Query
  alias Fog.{Repo, Data, Utils}
  import Repo, only: [sql_case: 1, concat: 2]

  def load_stream(ctx, opts) do
    base_q(ctx)
    |> subquery()
    |> with_stream_filter(opts)
    |> Repo.all()
    |> to_cursor()
  end

  def load_all(ctx) do
    base_q(ctx)
    |> Repo.all()
  end

  def base_q(), do: base_q([])
  def base_q(%Data.User{id: user_id}), do: base_q(user_id: user_id)
  def base_q(%Data.Agent{id: agent_id}), do: base_q(agent_id: agent_id)

  def base_q(ctx) do
    room_with_members_q()
    |> with_room_filter(ctx[:room_id])
    |> with_user_filter(ctx[:user_id])
    |> with_agent_filter(ctx[:agent_id])
    |> with_scoped_tags()
    |> badge_select()
  end

  def room_with_members_q() do
    from(r in Data.Room,
      as: :room,
      join: h in assoc(r, :helpdesk),
      join: w in assoc(h, :workspace),
      as: :workspace,
      join: v in assoc(w, :vendor),
      as: :vendor,
      join: au in fragment("(select 'A' as t UNION ALL select 'U')"),
      left_join: a in assoc(v, :agents),
      on: au.t == "A",
      as: :agent,
      left_join: u in assoc(h, :users),
      on: au.t == "U",
      as: :user,
      left_join: m in assoc(r, :members),
      on: r.type in ["private", "dialog"] and (m.agent_id == a.agent_id or m.user_id == u.id),
      where:
        r.type == "public" or
          not is_nil(m) or
          exists(
            from(ag in Data.VendorAgentGroup,
              where:
                ag.agent_id == parent_as(:agent).agent_id and
                  ag.vendor_id == parent_as(:vendor).id and
                  ag.group in parent_as(:room).agent_groups
            )
          )
    )
  end

  def badge_select(q) do
    from(
      [r, user: u, agent: a, vendor: v, workspace: w] in q,
      join: c in assoc(r, :customer),
      as: :customer,
      left_join: foa in subquery(Data.FeatureOption.for_vendor_agent()),
      on:
        not is_nil(a.agent_id) and foa.agent_id == a.agent_id and foa.vendor_id == v.id and
          foa.workspace_id == w.id,
      as: :foa,
      left_join: fou in subquery(Data.FeatureOption.for_user()),
      on:
        not is_nil(u.id) and fou.user_id == u.id and fou.vendor_id == v.id and
          fou.workspace_id == w.id,
      left_join: s in Data.Seen,
      as: :seen,
      on: s.room_id == r.id and (s.user_id == u.id or s.agent_id == a.agent_id),
      left_lateral_join:
        mlast in subquery(
          last(from(m in Data.Message, where: m.room_id == parent_as(:room).id, order_by: m.id))
        ),
      on: mlast.room_id == r.id,
      as: :mlast,
      left_lateral_join:
        munread in subquery(
          from(m in Data.Message,
            left_join: mentions in assoc(m, :mentions),
            on:
              parent_as(:user).id == mentions.user_id or
                parent_as(:agent).agent_id == mentions.agent_id,
            select: %{
              room_id: m.room_id,
              count: count(m.id),
              mentions_count: count(mentions.message_id),
              first_id: min(m.id),
              next_mention_id: min(mentions.message_id)
            },
            where:
              m.room_id == parent_as(:room).id and
                m.id > coalesce(parent_as(:seen).message_id, 0) and
                m.inserted_at >
                  coalesce(parent_as(:user).inserted_at, parent_as(:agent).inserted_at) and
                (is_nil(parent_as(:agent).agent_id) or
                   is_nil(parent_as(:room).resolved_at) or
                   not parent_as(:room).resolved or
                   m.inserted_at > parent_as(:room).resolved_at),
            group_by: m.room_id
          )
        ),
      on: munread.room_id == r.id,
      as: :munread,
      left_join:
        assigned in subquery(
          from(rt in Data.RoomTag,
            join: tag in assoc(rt, :tag),
            where: like(tag.name, ":assignee:%"),
            group_by: rt.room_id,
            select: %{
              room_id: rt.room_id,
              count: count()
            }
          )
        ),
      on: assigned.room_id == r.id,
      as: :assigned,
      where:
        r.type != "public" or
          (not is_nil(s) and s.is_following == true) or
          coalesce(munread.mentions_count, 0) > 0 or
          (foa.agent_customer_following == true and not like(c.name, "$Cust_Internal_%")) or
          (fou.user_triage_following == true and r.is_triage == true),
      where: not is_nil(s.inserted_at) or not is_nil(mlast.inserted_at),
      select: %Data.Badge{
        agent_id: a.agent_id,
        user_id: u.id,
        room_id: r.id,
        vendor_id: v.id,
        workspace_id: w.id,
        last_room_message_id: mlast.id,
        first_unread_message_id: munread.first_id,
        next_mention_message_id: munread.next_mention_id,
        updated_at:
          type(
            fragment("greatest(?, ?, ?)", s.inserted_at, mlast.inserted_at, r.resolved_at),
            :utc_datetime_usec
          ),
        following:
          type(
            sql_case do
              not is_nil(s) and s.is_following ->
                2

              not is_nil(s) and not s.is_following ->
                0

              (foa.agent_customer_following == true and not like(c.name, "$Cust_Internal_%")) or
                (fou.user_triage_following == true and r.is_triage == true) or
                  r.type != "public" ->
                1
            else
              0
            end,
            :integer
          )
      },
      select_merge:
        ^%{
          count: unread_count(),
          mentions_count: mentions_count()
        }
    )
  end

  defp assigned_me() do
    dynamic(
      exists(
        from(rt in Data.RoomTag,
          join: tag in assoc(rt, :tag),
          left_join: my_groups in Data.VendorAgentGroup,
          on:
            my_groups.vendor_id == parent_as(:vendor).id and
              my_groups.agent_id == parent_as(:agent).agent_id and
              tag.name == concat(":assignee:group:", my_groups.group),
          where: rt.room_id == parent_as(:room).id and like(tag.name, ":assignee:%"),
          where:
            tag.name ==
              fragment(
                "concat(':assignee:a', lpad(? :: text, 20, '0'))",
                parent_as(:agent).agent_id
              ) or
              not is_nil(my_groups.agent_id)
        )
      )
    )
  end

  defp unread_count() do
    dynamic(
      [r, munread: munread, assigned: assigned, agent: a],
      sql_case do
        not is_nil(a.agent_id) and
          coalesce(assigned.count, 0) > 0 and
            not (^assigned_me()) ->
          0
      else
        coalesce(munread.count, 0)
      end
    )
  end

  defp mentions_count() do
    dynamic(
      [r, munread: munread],
      coalesce(munread.mentions_count, 0)
    )
  end

  defp with_user_filter(q, nil), do: q

  defp with_user_filter(q, user_id) do
    from([r, user: u] in q,
      where: not is_nil(u) and u.id == ^user_id
    )
  end

  defp with_agent_filter(q, nil), do: q

  defp with_agent_filter(q, agent_id) do
    from([r, agent: a] in q,
      where: not is_nil(a) and a.agent_id == ^agent_id
    )
  end

  defp with_room_filter(q, nil), do: q

  defp with_room_filter(q, room_id) do
    from(r in q,
      where: not is_nil(r) and r.id == ^room_id
    )
  end

  defp with_scoped_tags(q) do
    from([r, workspace: w, user: u] in q,
      left_join: f in assoc(w, :feature_flags),
      on: f.feature_flag_id == "User Tag Scoping",
      left_lateral_join:
        room_first_tag in subquery(
          first(from(rt in Data.RoomTag, where: rt.room_id == parent_as(:room).id))
        ),
      on: room_first_tag.room_id == r.id,
      left_lateral_join:
        common_tag in subquery(
          first(
            from(rt in Data.RoomTag,
              join: ut in Data.AuthorTag,
              where:
                rt.room_id == parent_as(:room).id and ut.user_id == parent_as(:user).id and
                  rt.tag_id == ut.tag_id,
              select: %{room_id: rt.room_id, user_id: ut.user_id}
            )
          )
        ),
      on: r.id == common_tag.room_id and u.id == common_tag.user_id,
      # no scoped flag
      # no user
      # room without tags
      where:
        is_nil(f) or
          is_nil(u) or
          is_nil(room_first_tag) or
          not is_nil(common_tag)
    )
  end

  defp with_stream_filter(q, %{next: next} = opts) when is_binary(next) do
    {ts, id} = pos_decode(next)

    where(q, [b], {b.updated_at, b.room_id} > {^Utils.from_unix(ts), ^id})
    |> order_by([:updated_at, :room_id])
    |> Repo.Query.set_limit(opts)
  end

  defp with_stream_filter(q, %{prev: prev} = opts) when is_binary(prev) do
    {ts, id} = pos_decode(prev)

    where(q, [b], {b.updated_at, b.room_id} < {^Utils.from_unix(ts), ^id})
    |> order_by(desc: :updated_at, desc: :room_id)
    |> Repo.Query.set_limit(opts)
  end

  defp with_stream_filter(q, %{since: since} = opts) when is_integer(since) do
    where(q, [q], q.updated_at > ^Utils.from_unix(since))
    |> order_by([:updated_at, :room_id])
    |> Repo.Query.set_limit(opts)
  end

  defp with_stream_filter(q, %{before: before} = opts) when is_integer(before) do
    from(q in q, where: q.updated_at < ^Fog.Utils.from_unix(before))
    |> order_by(desc: :updated_at, desc: :room_id)
    |> Repo.Query.set_limit(opts)
  end

  defp with_stream_filter(q, opts) do
    order_by(q, desc: :updated_at, desc: :room_id)
    |> Repo.Query.set_limit(opts)
  end

  defp to_cursor([]) do
    %{items: [], next: nil, prev: nil}
  end

  defp to_cursor(items) do
    item_pos = items |> Enum.map(&pos/1)
    next = Enum.max(item_pos) |> pos_encode()
    prev = Enum.min(item_pos) |> pos_encode()
    %{items: items, next: next, prev: prev}
  end

  defp pos(%Data.Badge{room_id: room_id, updated_at: ts}),
    do: {ts |> Fog.Utils.to_unix(), room_id}

  defp pos_encode(pos), do: pos |> :erlang.term_to_binary() |> Base.encode64()
  defp pos_decode(pos), do: pos |> Base.decode64!() |> :erlang.binary_to_term([:safe])
end
