defmodule Fog.Service.ImportUsers do
  alias Fog.{Repo, Data, Api}
  import Ecto.Query

  def import(entries, vendor_id, workspace_id) do
    triage_tag = Repo.Tag.create(workspace_id, ":triage")

    {:ok, {new_helpdesks, new_triages}} =
      Repo.transaction(fn ->
        Data.Vendor
        |> Repo.get(vendor_id)
        |> import_customers(entries)
        |> import_helpdesks(workspace_id, entries, triage_tag)
      end)

    for h <- new_helpdesks, do: Api.Event.Customer.publish(h)
    for r <- new_triages, do: maybe_default_assignment_tag(r, workspace_id)
    for r <- new_triages, do: Api.Event.Room.publish(r)

    :ok
  end

  defp maybe_default_assignment_tag(room, wid) do
    case Repo.FeatureOption.get(Repo.Workspace.get(wid)).default_group_assignment do
      nil ->
        :ok

      group_name ->
        tag_name = ":assignee:group:#{group_name}"
        tag = Repo.Tag.create(wid, tag_name)
        Fog.Repo.Room.update_tags(room.id, [tag.id], [], nil, nil)
        :ok
    end
  end

  defp import_customers(vendor, entries) do
    customer_ex_uids =
      entries
      |> Enum.map(& &1.customer_id)
      |> Enum.uniq()

    filter =
      from(
        c in Data.Customer,
        where: c.external_uid in ^customer_ex_uids
      )

    vendor =
      vendor
      |> Repo.preload(customers: filter)

    updates =
      entries
      |> Enum.map(&to_customer/1)
      |> merge_updates(vendor.customers, :external_uid)

    vendor
    |> Data.Vendor.update(%{customers: updates})
    |> Repo.update!()
  end

  defp import_helpdesks(vendor, workspace_id, entries, triage_tag) do
    customer_ids = Enum.map(vendor.customers, & &1.id)

    user_ex_uids =
      Enum.filter(entries, &(not is_nil(&1.user_id)))
      |> Enum.map(& &1.user_id)

    user_emails =
      Enum.filter(entries, &(not is_nil(&1.user_email)))
      |> Enum.map(&(&1.user_email |> to_downcased_binary))

    userFilter =
      from(
        u in Data.User,
        where: u.external_uid in ^user_ex_uids or u.email in ^user_emails
      )

    helpdeskFilter =
      from(
        h in Data.Helpdesk,
        where: h.customer_id in ^customer_ids,
        preload: [[triage: :tags], users: ^userFilter]
      )

    workspace =
      Data.Workspace
      |> where(vendor_id: ^vendor.id)
      |> Repo.get(workspace_id)
      |> Repo.preload(helpdesks: helpdeskFilter)

    old_triage_ids = for h <- workspace.helpdesks, do: h.triage && h.triage.id

    old_helpdesk_ids = Enum.map(workspace.helpdesks, & &1.id)

    updates =
      to_helpdesks(entries, vendor, workspace, triage_tag)
      |> merge_updates(workspace.helpdesks, :customer_id)

    workspace =
      workspace
      |> Data.Workspace.update(%{helpdesks: updates})
      |> Repo.update!()

    new_helpdesks =
      for h <- workspace.helpdesks, h.id not in old_helpdesk_ids do
        h
      end

    new_triages =
      for h <- workspace.helpdesks, h.triage.id not in old_triage_ids do
        h.triage
      end

    {new_helpdesks, new_triages}
  end

  defp to_customer(%Data.ImportUser{
         customer_id: id,
         customer_name: name
       }) do
    %{external_uid: id, name: name, deleted_at: nil, deleted_by_agent_id: nil}
  end

  defp to_user(%Data.ImportUser{user_id: nil, user_email: nil}) do
    nil
  end

  defp to_user(%Data.ImportUser{
         user_id: id,
         user_name: name,
         user_email: email,
         user_picture: image_url
       }) do
    %{external_uid: id, name: name, email: email |> to_downcased_binary, image_url: image_url}
  end

  defp to_helpdesks(entries, vendor, workspace, triage_tag) do
    customer_ids = Map.new(vendor.customers, &{&1.external_uid, &1.id})

    helpdesk_info =
      Map.new(workspace.helpdesks, fn h ->
        {h.customer_id,
         %{
           id: h.id,
           users: h.users,
           triage_id: h.triage.id,
           triage_name: h.triage.name,
           triage: h.triage
         }}
      end)

    entries
    |> Enum.group_by(fn e -> e.customer_id end, &to_user/1)
    |> Enum.map(fn {customer_external_uid, users} ->
      customer_id = customer_ids[customer_external_uid]
      info = helpdesk_info[customer_id] || %{}

      tags = info[:triage][:tags] || []

      new_triage_tag =
        if triage_tag.id in Enum.map(tags, & &1.tag_id) do
          []
        else
          [%{tag_id: triage_tag.id}]
        end

      tags = Enum.map(tags, &%{id: &1.id}) ++ new_triage_tag

      users = merge_updates(users, info[:users] || [], :email)

      users = merge_updates(users, info[:users] || [], :external_uid)

      users =
        users
        |> Enum.filter(fn
          %{external_uid: _external_uid, email: _email} ->
            true

          _ ->
            false
        end)

      %{
        id: info[:id],
        customer_id: customer_id,
        triage: %{
          id: info[:triage_id],
          name: info[:triage_name] || workspace.triage_name,
          tags: tags
        },
        users: users
      }
    end)
  end

  # will merge two lists of structures by `key` field
  # from old structures we will use only :id
  # :image_url from old structure will be retained if not present in new
  defp merge_updates(new, old, key) do
    old =
      Map.new(
        old,
        fn %{^key => val, :id => id} = o ->
          case Map.get(o, :image_url) do
            nil ->
              {val, %{id: id}}

            image_url ->
              {val, %{id: id, image_url: image_url}}
          end
        end
      )

    new =
      new
      |> Enum.filter(fn
        %{^key => _val} -> true
        _ -> false
      end)
      |> Map.new(fn %{^key => val} = upd ->
        {val, upd}
      end)

    Map.merge(old, new, fn _k, o, n ->
      case {Map.get(o, :image_url), Map.get(n, :image_url)} do
        {nil, nil} ->
          Map.put(n, :id, o.id)

        {_, image_url} when is_binary(image_url) ->
          n
          |> Map.put(:id, o.id)
          |> Map.put(:image_url, image_url)

        {image_url, _} when is_binary(image_url) ->
          n
          |> Map.put(:id, o.id)
          |> Map.put(:image_url, image_url)

        {_, {:default, image_url}} ->
          n
          |> Map.put(:id, o.id)
          |> Map.put(:image_url, image_url)
      end
    end)
    |> Map.values()
    |> Enum.map(fn m ->
      case Map.get(m, :image_url) do
        {:default, url} ->
          m |> Map.put(:image_url, url)

        _ ->
          m
      end
    end)
    |> Enum.map(fn m ->
      m
      |> Map.put(:deleted_at, nil)
      |> Map.put(:deleted_by_agent_id, nil)
    end)
  end

  defp to_downcased_binary(s) when is_binary(s) do
    s |> String.downcase()
  end

  defp to_downcased_binary(x), do: "#{inspect(x)}"
end
