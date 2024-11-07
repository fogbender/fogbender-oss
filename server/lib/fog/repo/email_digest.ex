defmodule Fog.Repo.EmailDigest do
  import Ecto.Query
  alias Fog.{Data, Repo}

  @badge_messages_count 5

  def agents_to_notify(time, limit) do
    agents_to_notify_q()
    |> subquery()
    |> where([q], q.last_activity_at < q.workspace_last_message_at)
    |> where([q], q.last_activity_at < datetime_add(^time, -1 * q.email_digest_period, "second"))
    |> limit(^limit)
    |> Repo.all()
  end

  def users_to_notify(time, limit) do
    users_to_notify_q()
    |> subquery()
    |> where([q], q.last_activity_at < q.helpdesk_last_message_at)
    |> where([q], q.last_activity_at < datetime_add(^time, -1 * q.email_digest_period, "second"))
    |> limit(^limit)
    |> Repo.all()
  end

  def load_agent_badges([]), do: []

  def load_agent_badges(data) do
    Repo.Badge.base_q()
    |> filter_agents(data)
    |> subquery()
    |> where([q], q.count > 0)
    |> order_by(desc: :updated_at)
    |> Repo.all()
    |> enumerate()
    |> Enum.group_by(&{&1.vendor_id, &1.workspace_id, &1.agent_id})
    |> merge_updated_agents(data)
    |> enumerate()
    |> Repo.preload([
      :vendor,
      :workspace,
      :agent,
      badges: [
        room: :customer,
        first_unread_message: [:from_user, :from_agent, mentions: [:agent]]
      ]
    ])
    |> preload_room_messages()
    |> filter_badge_messages()
  end

  def load_user_badges([]), do: []

  def load_user_badges(data) do
    res0 =
      Repo.Badge.base_q()
      |> filter_users(data)
      |> subquery()
      |> where([q], q.count > 0)
      |> order_by(desc: :updated_at)
      |> Repo.all()

    res1 =
      res0
      |> enumerate()
      |> Enum.group_by(&{&1.vendor_id, &1.workspace_id, &1.user_id})

    res2 =
      res1
      |> merge_updated_users(data)
      |> enumerate()
      |> Repo.preload([
        :vendor,
        :workspace,
        :user,
        badges: [
          room: :customer,
          first_unread_message: [:from_user, :from_agent, mentions: [:agent]]
        ]
      ])
      |> preload_room_messages()

    res2
    |> filter_badge_messages()
    |> override_agent_name()
  end

  def explain_user_badges(data) do
    query =
      Repo.Badge.base_q()
      |> filter_users(data)
      |> subquery()
      |> where([q], q.count > 0)
      |> order_by(desc: :updated_at)

    {sql, bindings} = Ecto.Adapters.SQL.to_sql(:all, Repo, query)

    Repo.query!("EXPLAIN #{sql}", bindings)
    |> print_explain_analyze_result()
  end

  def analyze_user_badges(data) do
    query =
      Repo.Badge.base_q()
      |> filter_users(data)
      |> subquery()
      |> where([q], q.count > 0)
      |> order_by(desc: :updated_at)

    {sql, bindings} = Ecto.Adapters.SQL.to_sql(:all, Repo, query)

    Repo.query!("EXPLAIN ANALYZE #{sql}", bindings)
    |> print_explain_analyze_result()
  end

  def print_explain_analyze_result(%Postgrex.Result{rows: rows}) do
    rows
    |> Enum.each(fn [plan] -> IO.puts(plan) end)
  end

  defp override_agent_name(data) do
    for %Data.EmailDigest{} = em <- data do
      w = %Data.Workspace{} = em.workspace

      if (w.agent_name_override || "") != "" do
        badges = override_agent_name(em.badges, w.agent_name_override)
        %Data.EmailDigest{em | badges: badges}
      else
        em
      end
    end
  end

  defp override_agent_name(badges, name) do
    badges
    |> update_in(
      [Access.all(), :room, :messages, Access.all()],
      &override_message(&1, name)
    )
    |> update_in([Access.all(), :first_unread_message], &override_message(&1, name))
  end

  defp override_message(%Data.Message{} = m, name) do
    update_in(m.from_agent, &maybe_override_author_name(&1, name))
    |> maybe_update_mentions(name)
  end

  defp maybe_override_author_name(nil, _), do: nil
  defp maybe_override_author_name(%Data.Agent{} = a, name), do: put_in(a.name, name)

  defp maybe_update_mentions(%Data.Message{mentions: []} = m, _), do: m

  defp maybe_update_mentions(%Data.Message{mentions: mentions, text: text} = m, name) do
    text =
      Enum.reduce(mentions, text, fn
        %Data.Mention{agent: nil}, text ->
          text

        %Data.Mention{text: mention_text}, text ->
          String.replace(text, "@" <> mention_text, "@" <> name)
      end)

    %Data.Message{m | text: text}
  end

  defp preload_room_messages(digests) do
    query =
      for %Data.EmailDigest{last_activity_at: lat, badges: badges} <- digests,
          %Data.Badge{room_id: room_id} <- badges,
          reduce: %{} do
        acc -> Map.update(acc, room_id, lat, &min(&1, lat))
      end
      |> Enum.reduce(
        # union_all inherits limit from the first query, so lets keep it empty
        from(m in Data.Message, where: false),
        fn {room_id, last_activity_at}, prev_query ->
          query =
            from(
              m in Data.Message,
              where: m.room_id == ^room_id and m.inserted_at > ^last_activity_at,
              order_by: [desc: m.id],
              limit: @badge_messages_count
            )

          union_all(prev_query, ^query)
        end
      )

    Repo.preload(digests,
      badges: [
        room: [
          messages: {
            from(r in subquery(query)),
            [
              :from_user,
              :from_agent,
              sources: &Repo.Message.sources/1,
              mentions: [:agent]
            ]
          }
        ]
      ]
    )
  end

  defp filter_badge_messages(digests) do
    for %Data.EmailDigest{last_activity_at: lat, badges: badges} = d <- digests do
      badges =
        for badge <- badges do
          Map.update!(badge, :room, fn %Data.Room{messages: messages} = r ->
            messages =
              messages
              |> Enum.filter(fn %Data.Message{inserted_at: iat} ->
                DateTime.compare(iat, lat) == :gt
              end)
              |> Enum.sort_by(& &1.id)

            %Data.Room{r | messages: messages}
          end)
        end

      %Data.EmailDigest{d | badges: badges}
    end
  end

  defp merge_updated_agents(grouped_badges, data) do
    for {{vid, wid, aid}, badges} <- grouped_badges,
        %Data.EmailDigest{vendor_id: ^vid, workspace_id: ^wid, agent_id: ^aid} = d <- data,
        DateTime.compare(max_updated_at(badges), d.last_activity_at) == :gt do
      %Data.EmailDigest{d | badges: badges}
    end
  end

  defp merge_updated_users(grouped_badges, data) do
    for {{vid, wid, uid}, badges} <- grouped_badges,
        %Data.EmailDigest{vendor_id: ^vid, workspace_id: ^wid, user_id: ^uid} = d <- data,
        DateTime.compare(max_updated_at(badges), d.last_activity_at) == :gt do
      %Data.EmailDigest{d | badges: badges}
    end
  end

  defp max_updated_at(badges) do
    badges
    |> Enum.map(& &1.updated_at)
    |> Enum.max(DateTime)
  end

  defp agents_to_notify_q() do
    from(
      fo in subquery(Data.FeatureOption.for_vendor_agent()),
      join: ar in Data.VendorAgentRole,
      on: ar.agent_id == fo.agent_id and ar.vendor_id == fo.vendor_id,
      join: a in Data.Agent,
      on: a.id == ar.agent_id and a.is_bot == false,
      left_join: seen in subquery(agent_seen_q()),
      on: seen.agent_id == fo.agent_id and seen.workspace_id == fo.workspace_id,
      left_join: wlm in subquery(workspace_last_msg_q()),
      on: wlm.workspace_id == fo.workspace_id,
      where: fo.email_digest_enabled == true,
      select: %Data.EmailDigest{
        vendor_id: fo.vendor_id,
        workspace_id: fo.workspace_id,
        agent_id: fo.agent_id,
        to_type: "agent",
        last_activity_at:
          type(
            fragment(
              "GREATEST(?,?,?,?)",
              seen.last_seen_at,
              ar.last_activity_at,
              ar.last_digest_check_at,
              a.inserted_at
            ),
            :utc_datetime_usec
          ),
        workspace_last_message_at: wlm.last_message_at,
        email_digest_period: fo.email_digest_period,
        email_digest_template: fo.email_digest_template
      }
    )
  end

  defp agent_seen_q() do
    from(s in Data.Seen,
      join: r in assoc(s, :room),
      join: w in assoc(r, :workspace),
      group_by: [w.id, s.agent_id],
      where: not is_nil(s.agent_id),
      select: %{
        workspace_id: w.id,
        agent_id: s.agent_id,
        last_seen_at: max(s.updated_at)
      }
    )
  end

  defp workspace_last_msg_q() do
    from(w in Data.Workspace,
      join: m in assoc(w, :messages),
      where: is_nil(m.deleted_at),
      group_by: [w.id],
      select: %{
        workspace_id: w.id,
        last_message_at: max(m.inserted_at)
      }
    )
  end

  defp helpdesk_last_msg_q() do
    from(h in Data.Helpdesk,
      join: m in assoc(h, :messages),
      where: is_nil(m.deleted_at),
      group_by: [h.id],
      select: %{
        helpdesk_id: h.id,
        last_message_at: max(m.inserted_at)
      }
    )
  end

  defp filter_agents(query, data) do
    filter =
      for(%Data.EmailDigest{agent_id: aid, vendor_id: vid} <- data, do: {vid, aid})
      |> Enum.uniq()
      |> Enum.reduce(false, fn {vid, aid}, condition ->
        dynamic([agent: ar], (ar.vendor_id == ^vid and ar.agent_id == ^aid) or ^condition)
      end)

    from(query, where: ^filter)
  end

  defp users_to_notify_q() do
    from(
      fo in subquery(Data.FeatureOption.for_user()),
      join: u in assoc(fo, :user),
      left_join: seen in subquery(user_seen_q()),
      on: seen.user_id == fo.user_id and seen.workspace_id == fo.workspace_id,
      left_join: hlm in subquery(helpdesk_last_msg_q()),
      on: hlm.helpdesk_id == u.helpdesk_id,
      where: is_nil(u.deleted_at),
      where: u.email_verified == true,
      where: fo.email_digest_enabled == true,
      select: %Data.EmailDigest{
        vendor_id: fo.vendor_id,
        workspace_id: fo.workspace_id,
        user_id: fo.user_id,
        to_type: "user",
        last_activity_at:
          type(
            fragment(
              "GREATEST(?,?,?,?)",
              seen.last_seen_at,
              u.last_activity_at,
              u.last_digest_check_at,
              u.inserted_at
            ),
            :utc_datetime_usec
          ),
        helpdesk_last_message_at: hlm.last_message_at,
        email_digest_period: fo.email_digest_period,
        email_digest_template: fo.email_digest_template
      }
    )
  end

  defp user_seen_q() do
    from(s in Data.Seen,
      join: r in assoc(s, :room),
      join: w in assoc(r, :workspace),
      group_by: [w.id, s.user_id],
      where: not is_nil(s.user_id),
      select: %{
        workspace_id: w.id,
        user_id: s.user_id,
        last_seen_at: max(s.updated_at)
      }
    )
  end

  defp filter_users(query, data) do
    filter =
      data
      |> Enum.map(& &1.user_id)
      |> Enum.uniq()

    where(query, [user: u], u.id in ^filter)
  end

  defp enumerate(l), do: enumerate(l, 0)
  defp enumerate([], _), do: []
  defp enumerate([x | xs], i), do: [%{x | id: i} | enumerate(xs, i + 1)]
end
