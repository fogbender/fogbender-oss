defmodule Fog.Repo.Helpdesk do
  alias Fog.{Data, Repo}
  import Ecto.Query

  def get(helpdesk_id), do: Data.Helpdesk |> Repo.get(helpdesk_id)

  def get_external(workspace_id) do
    external =
      from(
        h in Data.Helpdesk,
        join: c in assoc(h, :customer),
        on: like(c.name, "$Cust_External_%"),
        where: h.workspace_id == ^workspace_id
      )
      |> Repo.one()
      |> Repo.preload(:customer)

    case external do
      nil ->
        create_external(workspace_id)

      _ ->
        external
    end
  end

  defp create_external(workspace_id) do
    workspace = Repo.Workspace.get(workspace_id)
    customer_name = "$Cust_External_#{Fog.Types.WorkspaceId.dump(workspace_id) |> elem(1)}"

    Data.Customer.new(
      name: customer_name,
      external_uid: customer_name,
      vendor_id: workspace.vendor_id
    )
    |> Repo.insert!(on_conflict: :nothing)

    customer = Repo.get_by(Data.Customer, vendor_id: workspace.vendor_id, name: customer_name)

    Data.Helpdesk.new(
      customer_id: customer.id,
      workspace_id: workspace_id
    )
    |> Repo.insert!(on_conflict: :nothing)

    get_external(workspace_id)
  end

  def get_internal(workspace_id) do
    from(
      h in Data.Helpdesk,
      join: c in assoc(h, :customer),
      on: like(c.name, "$Cust_Internal_%"),
      where: h.workspace_id == ^workspace_id
    )
    |> Repo.one()
  end

  def has_user?(helpdesk_id, user_id) do
    from(h in Data.Helpdesk,
      join: u in assoc(h, :users),
      where: h.id == ^helpdesk_id and u.id == ^user_id
    )
    |> Repo.exists?()
  end

  def agent_role(hid, aid) do
    from(av in Data.VendorAgentRole,
      join: v in assoc(av, :vendor),
      join: w in assoc(v, :workspaces),
      join: h in assoc(w, :helpdesks),
      where: h.id == ^hid and av.agent_id == ^aid,
      select: av.role
    )
    |> Repo.one()
  end

  def flags(hid) do
    from(h in Data.Helpdesk,
      join: w in assoc(h, :workspace),
      join: wf in assoc(w, :feature_flags),
      where: h.id == ^hid,
      select: wf.feature_flag_id
    )
    |> Repo.all()
  end

  def rooms_by_tag_ids(helpdesk_id, tag_ids) do
    from(
      r in Data.Room,
      join: t in assoc(r, :tags),
      on: t.tag_id in ^tag_ids,
      where: r.helpdesk_id == ^helpdesk_id
    )
    |> Repo.all()
  end

  def internal?(%Data.Helpdesk{} = h) do
    h = Repo.preload(h, :customer)

    case h.customer.name do
      "$Cust_Internal_" <> _ -> true
      _ -> false
    end
  end

  def internal?(id) do
    Data.Helpdesk
    |> Repo.get(id)
    |> internal?
  end

  def printable_customer_name("$Cust_Internal_" <> _), do: "Internal Conversations"
  def printable_customer_name("$Cust_External_" <> _), do: "Shared Email Inbox"
  def printable_customer_name(name), do: name

  def search(workspace_id, ids, term, limit) do
    from(h in Data.Helpdesk,
      join: c in assoc(h, :customer),
      where: h.workspace_id == ^workspace_id,
      where: ^ids_filter(ids),
      where: ^similarity_filter(term),
      limit: ^limit
    )
    |> with_last_message_at()
    |> with_users_count()
    |> order_by_relevance(term)
    |> order_by([h], desc: h.inserted_at)
    |> Repo.all()
  end

  defp with_last_message_at(q) do
    from([h] in q,
      left_join:
        lm in subquery(
          from(h in Data.Helpdesk,
            join: m in assoc(h, :messages),
            group_by: h.id,
            select: %{helpdesk_id: h.id, last_message_at: max(m.inserted_at)}
          )
        ),
      on: lm.helpdesk_id == h.id,
      select_merge: %{last_message_at: lm.last_message_at}
    )
  end

  defp with_users_count(q) do
    from([h] in q,
      left_join:
        u in subquery(
          from(u in Data.User,
            group_by: u.helpdesk_id,
            select: %{helpdesk_id: u.helpdesk_id, users_count: count(u.id)}
          )
        ),
      on: u.helpdesk_id == h.id,
      select_merge: %{users_count: coalesce(u.users_count, 0)}
    )
  end

  defp similarity_filter(""), do: true

  defp similarity_filter(term) do
    dynamic([h, c], fragment("lower(?) =% lower(?)", c.name, ^term))
  end

  defp ids_filter([]), do: true
  defp ids_filter(ids), do: dynamic([h, c], c.id in ^ids)

  defp order_by_relevance(query, term) do
    words = String.split(term, " ")

    query
    |> order_by([h, c], desc: fragment("? ~* ('\\m' || ?|| '\\M')", c.name, ^term))
    |> order_by([h, c], desc: fragment("? ~* ?", c.name, ^term))
    |> order_by(^order_by_words(words))
    |> order_by(^order_by_words_wild(words))
    |> order_by([h, c], desc: fragment("bigm_similarity(lower(?), lower(?))", c.name, ^term))
  end

  defp order_by_words(words) when length(words) > 1 do
    exp =
      words
      |> Enum.reduce(dynamic(0), fn word, dyn ->
        dynamic(
          [h, c],
          ^dyn + fragment("case when ? ~* ('\\m' || ? || '\\M') then 1 else 0 end", c.name, ^word)
        )
      end)

    [desc: exp]
  end

  defp order_by_words(_), do: dynamic(true)

  defp order_by_words_wild(words) when length(words) > 1 do
    exp =
      words
      |> Enum.reduce(0, fn word, acc ->
        dynamic([h, c], ^acc + fragment("case when ? ~* ? then 1 else 0 end", c.name, ^word))
      end)

    [desc: exp]
  end

  defp order_by_words_wild(_), do: dynamic(true)
end
