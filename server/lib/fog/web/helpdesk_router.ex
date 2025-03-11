defmodule Fog.Web.ApiHelpdeskRouter do
  require Logger
  require Ecto.Query.API

  import Ecto.Query, only: [from: 2]

  import Fog.Web.Helpers

  use Plug.Router

  alias Fog.{Api, Data, Merge, Repo}

  plug(:match)

  plug(:fetch_query_params)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Fog.Plug.AgentSession)

  plug(:dispatch)

  get "/:helpdesk_id" do
    case Data.Helpdesk |> Repo.get(helpdesk_id) |> Repo.preload([:vendor, :workspace]) do
      nil ->
        send_resp(conn, 404, "Not found")

      %Data.Helpdesk{
        workspace: %Data.Workspace{id: workspace_id},
        vendor: %Data.Vendor{id: vendor_id}
      } ->
        our_role = our_role(conn, vendor_id)

        if role_at_or_above(our_role, "reader") do
          data =
            from(
              h in helpdesks_query(workspace_id),
              where: h.id == ^helpdesk_id
            )
            |> Repo.one()

          [data] = [data] |> dates_to_unix()
          [data] = [data] |> to_customer_ids_in_domain_matches()
          [data] = [data] |> with_crms()

          data =
            case data do
              %{crms: [_ | _] = crms} ->
                crm_data =
                  crms
                  |> Enum.map(fn %{
                                   crmRemoteAccountId: crm_remote_account_id,
                                   crmRemoteId: crm_remote_id
                                 } = crm ->
                    case merge_integration(workspace_id, {:crm_remote_id, crm_remote_id}) do
                      nil ->
                        nil

                      integration ->
                        %{"account_token" => account_token} = integration.specifics
                        [data] = Merge.Api.account(account_token, crm_remote_account_id)
                        %{crm: crm, data: data}
                    end
                  end)
                  |> Enum.filter(&(not is_nil(&1)))

                data |> Map.merge(%{crmData: crm_data})

              _ ->
                data
            end

          data = data |> Jason.encode!(pretty: true)

          ok_json(conn, data)
        else
          forbid(conn)
        end
    end
  end

  get "/:helpdesk_id/users" do
    data =
      Ecto.Query.from(
        u in Data.User,
        where: u.helpdesk_id == ^helpdesk_id,
        preload: [tags: :tag]
      )
      |> Repo.all()
      |> Enum.map(
        &%{
          id: &1.id,
          name: &1.name,
          email: &1.email,
          external_uid: &1.external_uid,
          inserted_at: &1.inserted_at |> to_unix(),
          avatar_url: &1.image_url,
          deleted_at: &1.deleted_at |> to_unix(),
          deleted_by_agent_id: &1.deleted_by_agent_id,
          tags:
            &1.tags
            # TODO somehow we can end up with an association pointing to a tag that doesn't exist
            |> Enum.filter(fn t ->
              not is_nil(t.tag)
            end)
            |> Enum.map(fn t ->
              %{
                id: t.tag.id,
                name: t.tag.name
              }
            end)
            |> Enum.sort(fn x, y -> x.name <= y.name end)
        }
      )
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  post "/:helpdesk_id/users/:user_id" do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload(:vendor)

    our_role = our_role(conn, helpdesk.vendor.id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, data} = Jason.decode(data)
      tag_to_remove = data["tagToRemove"]

      author_tag =
        Repo.get_by(Data.AuthorTag, user_id: user_id, tag_id: tag_to_remove)
        |> Repo.delete!()

      :ok = Api.Event.Tag.publish(author_tag, %{remove: true})

      Repo.Helpdesk.rooms_by_tag_ids(helpdesk_id, [tag_to_remove])
      |> Enum.each(&(:ok = Api.Event.Room.publish(&1)))

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  delete "/:helpdesk_id/users/:user_id" do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload(:vendor)

    our_role = our_role(conn, helpdesk.vendor.id)

    if role_at_or_above(our_role, "admin") do
      our_agent_id = conn.assigns[:agent_id]

      Repo.User.get(user_id)
      |> Data.User.update(
        deleted_at: DateTime.utc_now(),
        deleted_by_agent_id: our_agent_id
      )
      |> Repo.update!()

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/:helpdesk_id/users" do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload(:vendor)

    our_role = our_role(conn, helpdesk.vendor.id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, data} = Jason.decode(data)
      user_ids = data["userIds"]
      tags_to_add = data["tagsToAdd"]

      entries =
        user_ids
        |> Enum.map(fn uid ->
          u = Repo.User.get(uid) |> Repo.preload(tags: :tag)
          user_tags = u.tags |> Enum.map(& &1.tag.id)

          tags_to_add
          |> Enum.reject(&(&1 in user_tags))
          |> Enum.map(fn tid ->
            Data.AuthorTag.new(user_id: uid, tag_id: tid)
          end)
        end)
        |> List.flatten()

      {:ok, author_tags} =
        Repo.transaction(fn ->
          Enum.map(entries, &Repo.insert!(&1))
        end)

      author_tags |> Enum.each(&(:ok = Api.Event.Tag.publish(&1)))
      author_tag_ids = author_tags |> Enum.map(& &1.tag_id)

      Repo.Helpdesk.rooms_by_tag_ids(helpdesk_id, author_tag_ids)
      |> Enum.each(&(:ok = Api.Event.Room.publish(&1)))

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  get "/:helpdesk_id/intel/users/:user_id" do
    case Repo.Helpdesk.get(helpdesk_id) |> Repo.preload(:vendor) do
      nil ->
        send_resp(conn, 404, "Not found")

      %Data.Helpdesk{vendor: %Data.Vendor{id: vendor_id}} ->
        our_role = our_role(conn, vendor_id)

        if role_at_or_above(our_role, "reader") do
          case Repo.User.get(user_id) do
            nil ->
              send_resp(conn, 404, "Not found")

            %Data.User{helpdesk_id: ^helpdesk_id} = user ->
              intel = Repo.User.intel(user)

              ok_json(conn, intel |> Jason.encode!(pretty: true))

            _ ->
              forbid(conn)
          end
        else
          forbid(conn)
        end
    end
  end

  post "/:id/:operation" do
    case Data.Customer |> Repo.get(id) |> Repo.preload(:domains) do
      nil ->
        send_resp(conn, 404, "Not found")

      %Data.Customer{vendor_id: vendor_id} = customer ->
        our_role = our_role(conn, vendor_id)

        if role_at_or_above(our_role, "admin") do
          case operation do
            "add-domain" ->
              add_domain_to_customer(conn, customer)

            "remove-domain" ->
              remove_domain_from_customer(conn, customer)

            _ ->
              conn |> send_bad_request_json(%{error: %{unknown_operation: operation}})
          end
        else
          forbid(conn)
        end
    end
  end

  defp remove_domain_from_customer(
         conn,
         %Data.Customer{domains: domains} = customer
       ) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)

    case data["domain"] do
      nil ->
        conn |> send_bad_request_json(%{error: %{missing: "domain"}})

      domain ->
        domains =
          domains
          |> Enum.map(&%{domain: &1.domain, vendor_id: &1.vendor_id, customer_id: &1.customer_id})
          |> Enum.filter(&(&1.domain !== domain))

        %Data.Customer{} =
          Data.Customer.update(customer,
            domains: domains
          )
          |> Repo.update!()

        ok_no_content(conn)
    end
  end

  defp add_domain_to_customer(
         conn,
         %Data.Customer{id: id, vendor_id: vendor_id, domains: domains} = customer
       ) do
    domain = conn.params["domain"]

    case domain do
      nil ->
        conn |> send_bad_request_json(%{error: %{missing: "domain"}})

      domain ->
        domains =
          domains
          |> Enum.map(&%{domain: &1.domain, vendor_id: &1.vendor_id, customer_id: &1.customer_id})

        try do
          %Data.Customer{} =
            Data.Customer.update(customer,
              domains: [%{domain: domain, vendor_id: vendor_id, customer_id: id} | domains]
            )
            |> Repo.update!()

          ok_no_content(conn)
        rescue
          e in [Ecto.ConstraintError] ->
            Logger.error("Error: #{inspect(e)}")
            conn |> send_bad_request_json(%{error: "domain_taken"})
        end
    end
  end
end
