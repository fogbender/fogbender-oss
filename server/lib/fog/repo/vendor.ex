defmodule Fog.Repo.Vendor do
  import Ecto.Query
  alias Fog.{Data, Repo}

  def get(vendor_id), do: Data.Vendor |> Repo.get(vendor_id)

  def agent_role(vendor_id, agent_id) do
    from(av in Data.VendorAgentRole,
      where: av.vendor_id == ^vendor_id and av.agent_id == ^agent_id,
      select: av.role
    )
    |> Repo.one()
  end

  def update_customers_info(vendor_id, customers_data) do
    customers =
      for %{
            "customer_id" => exuid,
            "data" => data,
            "source" => source
          } <- customers_data["customers"] do
        %{external_uid: exuid, name: data["name"], info_logs: [%{data: data, source: source}]}
      end

    customer_ex_uids = Enum.map(customers, & &1.external_uid)
    filter = from(c in Data.Customer, where: c.external_uid in ^customer_ex_uids)

    vendor =
      get(vendor_id)
      |> Repo.preload(customers: filter)

    vendor = %{vendor | customers: Enum.map(vendor.customers, &%{&1 | info_logs: []})}

    updates =
      join_maps(customers, vendor.customers, :external_uid, fn _k, new, old ->
        Map.merge(new, %{id: Map.get(old, :id), name: new[:name] || Map.get(old, :name)})
      end)
      |> set_names()

    vendor
    |> Data.Vendor.update(%{customers: updates})
    |> Repo.update!()
  end

  defp join_maps(l, r, key, merge_fn) do
    ml = Map.new(l, fn rec -> {Map.get(rec, key), rec} end)
    mr = Map.new(r, fn rec -> {Map.get(rec, key), rec} end)

    Map.merge(ml, mr, merge_fn)
    |> Map.values()
  end

  defp set_names(updates) do
    for rec <- updates do
      case rec[:name] do
        nil -> Map.put(rec, :name, "Customer #{rec[:external_uid]}")
        _ -> rec
      end
    end
  end

  def add_group_to_vendors(group_name) do
    q =
      from(
        v in Data.Vendor,
        full_join: vg in Data.VendorGroup,
        on: vg.vendor_id == v.id,
        where: vg.group != ^group_name or is_nil(vg.group),
        group_by: v.id,
        select: %{
          vendor_id: v.id,
          group: ^group_name,
          inserted_at: fragment("now()"),
          updated_at: fragment("now()")
        }
      )

    Repo.insert_all(Data.VendorGroup, q, on_conflict: :nothing)
  end
end
