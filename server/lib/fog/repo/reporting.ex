defmodule Fog.Repo.Reporting do
  import Ecto.Query
  alias Fog.{Api, Data, Repo, Utils}

  def overview(wid, start_date, end_date, helpdesk_ids) do
    from(r in Data.Room,
      join: h in assoc(r, :helpdesk),
      on: h.workspace_id == ^wid,
      join: w in assoc(r, :workspace),
      left_join: c in assoc(w, :customers),
      on: r.helpdesk_id == h.id and h.customer_id == c.id,
      left_join: rt in assoc(r, :tags),
      on: rt.room_id == r.id,
      left_join: t in assoc(rt, :tag),
      where: not like(c.name, "$Cust_Internal_%"),
      left_join: am in assoc(r, :messages),
      on: am.room_id == r.id and is_nil(am.from_user_id),
      left_join: um in assoc(r, :messages),
      on: um.room_id == r.id and is_nil(um.from_agent_id),
      where: w.id == ^wid,
      where: r.status != "archived",
      select: %{
        customer_id: c.id,
        customer_name: c.name,
        customer_external_id: c.external_uid,
        room_id: r.id,
        room_name: r.name,
        room_type: r.type,
        room_inserted_at: r.inserted_at,
        room_is_triage: r.is_triage,
        room_tag_id: t.id,
        room_vendor_id: w.vendor_id,
        room_workspace_id: w.id,
        room_url: "",
        agent_message_count: count(am, :distinct),
        user_message_count: count(um, :distinct),
        last_agent_message_ts: max(am.inserted_at),
        last_user_message_ts: max(um.inserted_at),
        agent_count: count(am.from_agent_id, :distinct),
        user_count: count(um.from_user_id, :distinct)
      },
      group_by: [
        c.id,
        c.name,
        c.external_uid,
        r.id,
        r.name,
        r.type,
        r.inserted_at,
        t.id,
        w.vendor_id,
        w.id
      ]
    )
    |> with_date_range(start_date, end_date)
    |> with_helpdesk_ids(helpdesk_ids)
    |> Repo.all()
    |> dates_to_unix()
    |> room_urls()
    |> join_tags()
  end

  def dates_to_unix(records) do
    records
    |> Enum.map(fn r ->
      %{
        r
        | room_inserted_at: to_unix(r.room_inserted_at),
          last_agent_message_ts: to_unix(r.last_agent_message_ts),
          last_user_message_ts: to_unix(r.last_agent_message_ts)
      }
    end)
  end

  def room_urls(records) do
    records
    |> Enum.map(fn r ->
      %{
        r
        | room_url:
            "#{Fog.env(:fog_storefront_url)}/admin/vendor/#{r.room_vendor_id}/workspace/#{r.room_workspace_id}/chat/#{r.room_id}"
      }
    end)
  end

  def to_unix(nil), do: nil
  def to_unix(us), do: Utils.to_unix(us)

  def with_date_range(q, nil, nil) do
    q
  end

  def with_date_range(q, start_date, nil) do
    from(r in q,
      where: r.inserted_at > ^Utils.from_unix(start_date * 1000)
    )
  end

  def with_date_range(q, nil, end_date) do
    from(r in q,
      where: r.inserted_at < ^Utils.from_unix(end_date * 1000)
    )
  end

  def with_date_range(q, start_date, end_date) do
    from(r in q,
      where:
        r.inserted_at > ^Utils.from_unix(start_date * 1000) and
          r.inserted_at < ^Utils.from_unix(end_date * 1000)
    )
  end

  def with_helpdesk_ids(q, nil) do
    q
  end

  def with_helpdesk_ids(q, helpdesk_ids) do
    from(r in q,
      where: r.helpdesk_id in ^helpdesk_ids
    )
  end

  def join_tags(records) do
    records
    |> Enum.map(& &1.room_id)
    |> Enum.uniq()
    |> Enum.reduce([], fn room_id, acc ->
      rooms = records |> Enum.filter(&(&1.room_id == room_id))
      tags = tags(rooms)

      [
        rooms
        |> Enum.at(0)
        |> Map.delete(:room_tag_id)
        |> Map.delete(:room_tag_name)
        |> Map.delete(:room_tag_inserted_at)
        |> Map.put(:tags, tags)
        | acc
      ]
    end)
  end

  def tags(rooms) do
    tag_ids = rooms |> Enum.map(& &1.room_tag_id)

    from(t in Data.Tag,
      where: t.id in ^tag_ids
    )
    |> Repo.all()
    |> Enum.map(&Api.Event.Room.tag(&1))
  end

  def unix_ts(nil), do: nil
  def unix_ts(ts), do: ts |> Utils.to_unix()
end
