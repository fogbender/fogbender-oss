defmodule Fog.Web.Helpers do
  import Plug.Conn

  alias Fog.{Data, Repo, Utils}

  import Ecto.Query, only: [from: 2]

  ## responses
  def send_not_found_json(conn, data \\ %{"error" => "Not found"}) do
    send_error_json(conn, 404, data)
  end

  def send_bad_request_json(conn, data) do
    send_error_json(conn, 400, data)
  end

  def send_forbid_json(conn, data) do
    send_error_json(conn, 403, data)
  end

  def send_not_authorized_json(conn, data \\ %{"error" => "Not authorized"}) do
    send_error_json(conn, 401, data)
  end

  def send_ok_no_content(conn) do
    conn |> send_resp(204, "")
  end

  def send_ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, Jason.encode!(data))
  end

  defp send_error_json(conn, code, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(code, Jason.encode!(data))
    |> halt()
  end

  def forbid(conn, message \\ "") do
    conn |> send_resp(403, message)
  end

  def ok_no_content(conn) do
    conn |> send_resp(204, "")
  end

  def ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  ## /responses

  ## auth
  def role_at_or_above(role, "reader"),
    do: Enum.member?(["reader", "agent", "admin", "owner"], role)

  def role_at_or_above("agent", "agent"), do: true
  def role_at_or_above("admin", "agent"), do: true
  def role_at_or_above("owner", "agent"), do: true
  def role_at_or_above(_, "agent"), do: false

  def role_at_or_above("admin", "admin"), do: true
  def role_at_or_above("owner", "admin"), do: true
  def role_at_or_above(_, "admin"), do: false

  def role_at_or_above("owner", "owner"), do: true
  def role_at_or_above(_, "owner"), do: false
  ## /auth

  def our_role(conn, vendor_id) do
    our_agent_id = conn.assigns[:agent_id]

    case Data.VendorAgentRole
         |> Repo.get_by(agent_id: our_agent_id, vendor_id: vendor_id) do
      nil ->
        nil

      %Data.VendorAgentRole{:role => role} ->
        role
    end
  end

  ## dates
  def to_unix(nil), do: nil
  def to_unix(us), do: Utils.to_unix(us)

  def dates_to_unix(records) do
    records
    |> Enum.map(fn r ->
      %{
        r
        | insertedAt: to_unix(r.insertedAt),
          updatedAt: to_unix(r.updatedAt)
      }
    end)
  end

  ## /dates

  ## CRM
  def merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id}) do
    from(
      e in Data.WorkspaceIntegration,
      where: e.workspace_id == ^workspace_id,
      where: json_extract_path(e.specifics, ["driver"]) == "merge",
      where: json_extract_path(e.specifics, ["end_user_origin_id"]) == ^end_user_origin_id
    )
    |> Repo.one()
  end

  def merge_integration(workspace_id, {:crm_id, crm_id}) do
    from(
      e in Data.WorkspaceIntegration,
      where: e.workspace_id == ^workspace_id,
      where: json_extract_path(e.specifics, ["driver"]) == "merge",
      where: json_extract_path(e.specifics, ["crm_id"]) == ^crm_id
    )
    |> Repo.one()
  end

  def merge_integration(workspace_id, {:crm_remote_id, crm_remote_id}) do
    from(
      e in Data.WorkspaceIntegration,
      where: e.workspace_id == ^workspace_id,
      where: json_extract_path(e.specifics, ["driver"]) == "merge",
      where: json_extract_path(e.specifics, ["remote_id"]) == ^crm_remote_id
    )
    |> Repo.one()
  end

  def with_crms(records) do
    records
    |> Enum.map(fn r ->
      %{
        r
        | crms:
            case r.crms do
              [nil] ->
                []

              crms ->
                crms
                |> Enum.map(&from_crm(&1))
            end
      }
    end)
  end

  def from_crm(%Data.CustomerCrm{} = crm) do
    %{
      crmRemoteAccountId: crm.crm_remote_account_id,
      crmAccountId: crm.crm_account_id,
      crmId: crm.crm_id,
      crmRemoteId: crm.crm_remote_id,
      crmType: crm.crm_type,
      customerId: crm.customer_id
    }
  end

  def from_crm(crm) do
    %{
      crmRemoteAccountId: crm["crm_remote_account_id"],
      crmAccountId: crm["crm_account_id"],
      crmId: crm["crm_id"],
      crmRemoteId: crm["crm_remote_id"],
      crmType: crm["crm_type"],
      customerId: Fog.Types.CustomerId.load(crm["customer_id"]) |> elem(1)
    }
  end

  ## /CRM

  def helpdesks_query(workspace_id) do
    from(
      h in Data.Helpdesk,
      join: v in assoc(h, :vendor),
      join: c in assoc(h, :customer),
      on: not like(c.name, "$Cust_External_%"),
      where: h.workspace_id == ^workspace_id,
      left_join: d in assoc(c, :domains),
      left_join: cd in Data.CustomerDomain,
      on: cd.domain == d.domain and cd.customer_id != d.customer_id,
      left_join: crm in assoc(c, :crms),
      on: crm.customer_id == c.id,
      group_by: [c.id, h.id, v.id],
      select: %{
        id: c.id,
        name: c.name,
        helpdeskId: h.id,
        workspaceId: h.workspace_id,
        vendorId: v.id,
        externalUid: c.external_uid,
        insertedAt: c.inserted_at,
        updatedAt: c.updated_at,
        deletedAt: c.deleted_at,
        domains: fragment("array_remove(array_agg(distinct(?)), NULL)", d.domain),
        domainMatches:
          fragment("array_remove(array_agg(distinct(?)::text), NULL)", cd.customer_id),
        crms: fragment("json_agg(distinct(?))", crm)
      }
    )
  end

  def to_customer_ids_in_domain_matches(records) do
    # XXX there must be a better way to do this
    records
    |> Enum.map(fn r ->
      %{
        r
        | domainMatches:
            r.domainMatches
            |> Enum.map(&(Integer.parse(&1) |> elem(0) |> Fog.Types.CustomerId.load() |> elem(1)))
      }
    end)
  end
end
