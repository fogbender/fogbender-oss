defmodule Fog.Web.ApiVendorRouter do
  require Logger
  require Ecto.Query.API

  import Ecto.Query, only: [from: 2]

  use Plug.Router

  alias Fog.{Ai, Api, Data, Integration, Repo, Slack, Utils}
  alias Fog.Comms.{MsTeams, Slack}

  # TODO: write tests for all this - really

  plug(:match)

  plug(:fetch_query_params)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Fog.Plug.AgentSession)

  plug(:dispatch)

  get "/gimme-vendor-name" do
    our_agent_id = conn.assigns[:agent_id]

    %{email: email} = Repo.Agent.get(our_agent_id)

    [username, domain] = email |> String.split("@")

    fallback_name = "#{username |> String.capitalize()}’s Fearless Crew"

    {:ok, name} =
      case domain |> Fog.Email.GenericDomains.is_generic?() do
        true ->
          case Fog.Ai.ask_ai(
                 "Can you come up with a one- or two-word fictional company name, like Meticulous Widgets, Artisanos, or similar? Your response must contain the company name only and nothing else."
               ) do
            {:response, response} ->
              {:ok, response}

            e ->
              Logger.error("Error: #{inspect(e)} #{Exception.format_stacktrace()}")
              {:ok, fallback_name}
          end

        false ->
          case Fog.Ai.PageTitleExtractor.extract(domain) do
            {:ok, _} = response -> response
            _ -> {:ok, fallback_name}
          end
      end

    Process.sleep(2000)

    ok_json(conn, %{name: name} |> Jason.encode!(pretty: true))
  end

  get "/:vendor_id/agents" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "reader") do
      data =
        from(
          a in Data.Agent,
          join: r in Data.VendorAgentRole,
          on: a.id == r.agent_id,
          where: r.vendor_id == ^vendor_id,
          preload: [:vendors, [tags: :tag]]
        )
        |> Repo.all()
        |> Enum.map(&agent_to_data(&1, vendor_id))
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/:vendor_id/groups" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "reader") do
      res =
        from(
          ag in Data.VendorAgentGroup,
          right_join: vg in Data.VendorGroup,
          on: ag.group == vg.group and ag.vendor_id == vg.vendor_id,
          where: vg.vendor_id == ^vendor_id,
          preload: [agent: [[tags: :tag], :vendors]],
          select_merge: %{
            group: vg.group,
            agent_id: ag.agent_id
          }
        )
        |> Repo.all()

      map =
        res
        |> Enum.group_by(
          & &1.group,
          &case &1.agent do
            nil ->
              nil

            _ ->
              agent_to_data(&1.agent, vendor_id)
          end
        )

      data =
        map
        |> Map.keys()
        |> Enum.map(fn group ->
          %{
            name: group,
            vendorId: vendor_id,
            agents:
              case Map.get(map, group) do
                [nil] -> []
                v -> v
              end
          }
        end)
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/groups" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      name = conn.params["name"]

      Data.VendorGroup.new(%{
        vendor_id: vendor_id,
        group: name
      })
      |> Repo.insert(on_conflict: :nothing)

      Process.sleep(1000)
      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/groups/:name" do
    our_role = our_role(conn, vendor_id)

    if name && name !== "all" && role_at_or_above(our_role, "admin") do
      members_to_add = conn.params["membersToAdd"] || []
      members_to_remove = conn.params["membersToRemove"] || []

      structs_to_add =
        members_to_add
        |> Enum.map(fn agent_id ->
          %{
            agent_id: agent_id,
            vendor_id: vendor_id,
            group: name,
            inserted_at: DateTime.utc_now(),
            updated_at: DateTime.utc_now()
          }
        end)

      {:ok, _} =
        Ecto.Multi.new()
        |> Ecto.Multi.insert_all(
          :insert_all,
          Data.VendorAgentGroup,
          structs_to_add,
          on_conflict: {:replace, [:updated_at]},
          conflict_target: [:agent_id, :vendor_id, :group]
        )
        |> Ecto.Multi.delete_all(
          :delete_all,
          from(
            ag in Data.VendorAgentGroup,
            where:
              ag.vendor_id == ^vendor_id and ag.agent_id in ^members_to_remove and
                ag.group == ^name
          )
        )
        |> Repo.transaction()

      Process.sleep(1000)
      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  delete "/:vendor_id/groups/:name" do
    our_role = our_role(conn, vendor_id)

    if name && name !== "all" && role_at_or_above(our_role, "admin") do
      Data.VendorGroup
      |> Repo.get_by(vendor_id: vendor_id, group: name)
      |> Repo.delete!()

      Process.sleep(1000)
      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/create-checkout-session" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      seats = conn.params["seats"]
      %{"url" => url} = Fog.Stripe.Api.create_checkout_session(seats)

      ok_json(
        conn,
        %{url: url} |> Jason.encode!(pretty: true)
      )
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/set-stripe-session-id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      if is_stripe_configured() do
        session_id = conn.params["session_id"]
        {:ok, session} = Fog.Stripe.Api.get_checkout_session(session_id)

        %{"status" => "complete", "customer" => stripe_customer_id} = session

        Data.VendorStripeCustomer.new(%{
          vendor_id: vendor_id,
          stripe_customer_id: stripe_customer_id
        })
        |> Repo.insert!(on_conflict: :nothing)

        {:ok, %{"created" => created_ts_sec, "email" => email}} =
          Fog.Stripe.Api.get_customer(stripe_customer_id)

        %{"url" => portal_session_url} = Fog.Stripe.Api.create_portal_session(stripe_customer_id)

        ok_json(
          conn,
          %{
            email: email,
            created_ts_sec: created_ts_sec,
            portal_session_url: portal_session_url
          }
          |> Jason.encode!(pretty: true)
        )
      else
        forbid(conn)
      end
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/cancel-subscription" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      subscription_id = conn.params["subscriptionId"]
      :ok = Fog.Stripe.Api.delete_subscription(subscription_id)

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  get "/:vendor_id/billing" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "agent") do
      if is_stripe_configured() do
        billing(conn, vendor_id)
      else
        bad_request_json(
          conn,
          %{error: "Stripe is not configured"}
          |> Jason.encode!(pretty: true)
        )
      end
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/agents/:agent_id" do
    our_agent_id = conn.assigns[:agent_id]

    our_role = our_role(conn, vendor_id)
    {new_role, conn} = new_role(conn)
    {old, old_role} = old_role(vendor_id, agent_id)
    num_owners = num_owners(vendor_id)

    verdict =
      case {our_role, new_role, old_role, num_owners > 1} do
        {"agent", "reader", _, _} when agent_id === our_agent_id -> :yes
        {"reader", _, _, _} -> {:no, "Readers cannot assign roles"}
        {"agent", _, _, _} -> {:no, "Agents cannot assign roles"}
        {"admin", "owner", _, _} -> {:no, "Only owners can assign owners"}
        {"admin", _, "owner", _} -> {:no, "Only owners can reassign owners"}
        {"admin", _, _, _} -> :yes
        {"owner", _, "owner", true} -> :yes
        {"owner", _, "owner", false} -> {:no, "Assign another owner first"}
        {"owner", _, _, _} -> :yes
        _ -> :no
      end

    case verdict do
      :yes ->
        Data.VendorAgentRole.update(old, role: new_role) |> Repo.update!()

        our_agent_id = conn.assigns[:agent_id]

        :ok =
          Api.Event.Agent.publish(Repo.Agent.get(agent_id), vendor_id, %{
            updated_by: our_agent_id,
            updated_at: DateTime.utc_now()
          })

        :ok = update_billing(vendor_id)

        ok_no_content(conn)

      {:no, reason} ->
        forbid(conn, %{error: reason} |> Jason.encode!(pretty: true))

      _ ->
        forbid(conn)
    end
  end

  delete "/:vendor_id/customers/:customer_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      our_agent_id = conn.assigns[:agent_id]

      Data.Customer
      |> Repo.get(customer_id)
      |> Data.Customer.update(
        deleted_at: DateTime.utc_now(),
        deleted_by_agent_id: our_agent_id
      )
      |> Repo.update!()

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  delete "/:vendor_id/agents/:agent_id" do
    our_agent_id = conn.assigns[:agent_id]
    our_role = our_role(conn, vendor_id)

    # any agent can delete themselves and admins can delete anyone
    if role_at_or_above(our_role, "admin") or agent_id == conn.assigns[:agent_id] do
      %Data.VendorAgentRole{role: agent_role} =
        Data.VendorAgentRole |> Repo.get_by(agent_id: agent_id, vendor_id: vendor_id)

      {:ok,
       %{
         vendor_agent_role: {num_deleted, _}
       }} =
        Ecto.Multi.new()
        |> Ecto.Multi.insert(
          :deleted_vendor_agent_role,
          %Data.DeletedVendorAgentRole{
            agent_id: agent_id,
            vendor_id: vendor_id,
            role: agent_role,
            deleted_at: DateTime.utc_now(),
            deleted_by_agent_id: our_agent_id
          },
          on_conflict: {:replace, [:role, :deleted_by_agent_id, :deleted_at]},
          conflict_target: [:vendor_id, :agent_id]
        )
        |> Ecto.Multi.delete_all(
          :vendor_agent_role,
          from(
            r in Data.VendorAgentRole,
            where: r.vendor_id == ^vendor_id and r.agent_id == ^agent_id
          )
        )
        |> Ecto.Multi.delete_all(
          :vendor_agent_group,
          from(
            g in Data.VendorAgentGroup,
            where: g.vendor_id == ^vendor_id and g.agent_id == ^agent_id
          )
        )
        |> Repo.transaction()

      case num_deleted == 1 do
        true ->
          our_agent_id = conn.assigns[:agent_id]

          :ok =
            Api.Event.Agent.publish(Repo.Agent.get(agent_id), vendor_id, %{
              deleted_by: our_agent_id,
              deleted_at: DateTime.utc_now()
            })

        false ->
          :ok
      end

      :ok = update_billing(vendor_id)

      ok_no_content(conn)
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to remove members."} |> Jason.encode!(pretty: true)
      )
    end
  end

  get "/:vendor_id/workspaces" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "reader") do
      data =
        vendor_workspaces(vendor_id)
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/workspaces" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, new_workspace_id} = Snowflake.next_id()
      {:ok, new_internal_helpdesk_id} = Snowflake.next_id()
      {:ok, new_internal_customer_id} = Snowflake.next_id()

      new_workspace_name = conn.params["name"]
      new_workspace_description = conn.params["description"]
      new_workspace_triage_name = conn.params["triage_name"] || "Triage"

      {:ok,
       %{
         workspace: workspace
       }} =
        Ecto.Multi.new()
        |> Ecto.Multi.insert(
          :workspace,
          Data.Workspace.new(
            id: new_workspace_id,
            vendor_id: vendor_id,
            signature_type: "jwt",
            signature_secret: Fog.UserSignature.generate_192bit_secret(),
            visitor_key: Fog.UserSignature.generate_192bit_secret(),
            visitors_enabled: false,
            name: new_workspace_name,
            description: new_workspace_description,
            triage_name: new_workspace_triage_name
          )
        )
        |> Ecto.Multi.insert(
          :customer,
          Data.Customer.new(
            id: new_internal_customer_id,
            name: "$Cust_Internal_#{new_internal_customer_id}",
            vendor_id: vendor_id
          )
        )
        |> Ecto.Multi.insert(
          :helpdesk,
          Data.Helpdesk.new(
            id: new_internal_helpdesk_id,
            workspace_id: new_workspace_id,
            customer_id: new_internal_customer_id
          )
        )
        |> Repo.transaction()

      ok_json(conn, workspace |> Jason.encode!(pretty: true))
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to change workspace settings"}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  post "/:vendor_id/workspaces/:workspace_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, workspace} = Jason.decode(data)
      name = workspace["name"]
      description = workspace["description"]
      triage_name = workspace["triageName"]
      agent_name_override = workspace["agentNameOverride"]

      old =
        from(w in Data.Workspace,
          where: w.id == ^workspace_id and w.vendor_id == ^vendor_id
        )
        |> Repo.one()

      if old do
        Data.Workspace.update(old,
          name: name,
          description: description,
          triage_name: triage_name,
          agent_name_override: agent_name_override
        )
        |> Repo.update!()
      end

      Process.sleep(1000)

      ok_no_content(conn)
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to change workspace settings"}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  delete "/:vendor_id/workspaces/:workspace_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      our_agent_id = conn.assigns[:agent_id]

      Repo.Workspace.get(workspace_id)
      |> Data.Workspace.update(deleted_at: DateTime.utc_now(), deleted_by_agent_id: our_agent_id)
      |> Repo.update!()

      ok_no_content(conn)
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to delete workspace"}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  post "/:vendor_id/workspaces/:workspace_id/csv_import" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      with %{path: path} <- conn.body_params["file"],
           stream <- File.stream!(path),
           csv0 <- CSV.decode(stream, headers: true),
           {:ok, csv, _} <-
             csv0
             |> Enum.reduce({:ok, [], []}, fn
               {:ok, x}, {r, good, bad} -> {r, [x | good], bad}
               {:error, x}, {_, good, bad} -> {:error, good, [x | bad]}
             end),
           {:ok, entries} <- Data.ImportUser.from_csv(Enum.to_list(csv)) do
        :ok = Fog.Service.ImportUsers.import(entries, vendor_id, workspace_id)

        data =
          %{"status" => "success", "entries" => entries}
          |> Jason.encode!(pretty: true)

        ok_json(conn, data)
      else
        {:error, _valid, invalid} ->
          data =
            %{
              "status" => "error",
              "errors" =>
                invalid
                |> List.flatten()
                |> Enum.uniq()
                |> Enum.reverse()
            }
            |> Jason.encode!(pretty: true)

          ok_json(conn, data)
      end
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/workspaces/:workspace_id/customers" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, customer} = Jason.decode(data)

      Fog.Service.ImportUsers.import(
        [
          %Fog.Data.ImportUser{
            customer_id: customer["customerId"],
            customer_name: customer["customerName"]
          }
        ],
        vendor_id,
        workspace_id
      )

      ok_json(conn, [])
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to create customers"} |> Jason.encode!(pretty: true)
      )
    end
  end

  get "" do
    id = conn.assigns[:agent_id]

    data =
      from(
        v in Data.Vendor,
        join: r in Data.VendorAgentRole,
        on: r.vendor_id == v.id,
        where: r.agent_id == ^id and is_nil(v.deleted_at)
      )
      |> Repo.all()
      |> Enum.map(fn r ->
        %{
          r
          | inserted_at: to_unix(r.inserted_at),
            updated_at: to_unix(r.updated_at),
            deleted_at: to_unix(r.deleted_at)
        }
      end)
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  post "/" do
    agent_id = conn.assigns[:agent_id]
    new_vendor_name = conn.params["name"]

    {:ok, new_vendor_id} = Snowflake.next_id()

    {:ok,
     %{
       vendor: vendor,
       vendor_agent_role: _
     }} =
      Ecto.Multi.new()
      |> Ecto.Multi.insert(
        :vendor,
        Data.Vendor.new(id: new_vendor_id, name: new_vendor_name)
      )
      |> Ecto.Multi.insert(
        :vendor_agent_role,
        Data.VendorAgentRole.new(
          agent_id: agent_id,
          vendor_id: new_vendor_id,
          role: "owner"
        )
      )
      |> Ecto.Multi.insert(
        :vendor_agent_group,
        Data.VendorAgentGroup.new(
          agent_id: agent_id,
          vendor_id: new_vendor_id,
          group: "all"
        )
      )
      |> Ecto.Multi.insert(
        :vendor_group,
        Data.VendorGroup.new(
          vendor_id: new_vendor_id,
          group: "all"
        )
      )
      |> Repo.transaction()

    ok_json(conn, vendor |> Jason.encode!(pretty: true))
  end

  post "/:vendor_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, vendor} = Jason.decode(data)
      new_name = vendor["name"]

      old = Data.Vendor |> Repo.get(vendor_id)

      Data.Vendor.update(old, name: new_name)
      |> Repo.update!()

      ok_no_content(conn)
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to rename organization"} |> Jason.encode!(pretty: true)
      )
    end
  end

  get "/:vendor_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "reader") do
      data =
        Data.Vendor
        |> Repo.get(vendor_id)
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  delete "/:vendor_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "owner") do
      our_agent_id = conn.assigns[:agent_id]

      Repo.Vendor.get(vendor_id)
      |> Data.Vendor.update(
        deleted_at: DateTime.utc_now(),
        deleted_by_agent_id: our_agent_id
      )
      |> Repo.update!()

      ok_no_content(conn)
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to delete organization"}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  get "/:vendor_id/invites" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      data =
        from(
          i in Data.VendorAgentInvite,
          join: a in Data.Agent,
          on: i.from_agent_id == a.id,
          where: i.vendor_id == ^vendor_id and is_nil(i.deleted_at),
          select: %{
            invite_id: i.invite_id,
            email: i.email,
            role: i.role,
            inserted_at: i.inserted_at,
            from_agent: %{id: a.id, name: a.name, email: a.email}
          }
        )
        |> Repo.all()
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/:vendor_id/verified_domains" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      res =
        from(
          d in Data.VendorVerifiedDomain,
          where: d.vendor_id == ^vendor_id
        )
        |> Repo.all()

      ok_json(conn, res |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/verified_domains" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, data} = Jason.decode(data)

      domain = data["domain"]
      skip_dns_proof = data["skipDnsProof"]

      verified_domains_res = fn conn ->
        res =
          from(
            d in Data.VendorVerifiedDomain,
            where: d.vendor_id == ^vendor_id
          )
          |> Repo.all()

        ok_json(conn, res |> Jason.encode!(pretty: true))
      end

      is_generic = domain |> Fog.Email.GenericDomains.is_generic?()

      if domain do
        if is_generic === true do
          bad_request_json(
            conn,
            %{error: "#{domain} is generic (e.g. yahoo.com, gmail.com, etc)"}
            |> Jason.encode!(pretty: true)
          )
        else
          if skip_dns_proof === true do
            if our_role === "owner" do
              Data.VendorVerifiedDomain.new(
                vendor_id: vendor_id,
                domain: domain,
                verified: true
              )
              |> Repo.insert!(
                on_conflict: {:replace, [:verification_code, :verified]},
                conflict_target: [:vendor_id, :domain]
              )

              verified_domains_res.(conn)
            else
              bad_request_json(
                conn,
                %{error: "Must be owner to skip DNS proof"} |> Jason.encode!(pretty: true)
              )
            end
          else
            verification_code = :crypto.strong_rand_bytes(24) |> Base.url_encode64()
            verification_code = "fogbender-proof=#{verification_code}"

            Data.VendorVerifiedDomain.new(
              vendor_id: vendor_id,
              domain: domain,
              verification_code: verification_code
            )
            |> Repo.insert!(
              on_conflict: {:replace, [:verification_code]},
              conflict_target: [:vendor_id, :domain]
            )

            verified_domains_res.(conn)
          end
        end
      else
        bad_request_json(conn, %{error: "Missing 'domain' param"} |> Jason.encode!(pretty: true))
      end
    else
      forbid(conn)
    end
  end

  post "/:vendor_id/verified_domains/:domain" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      %Data.VendorVerifiedDomain{verification_code: verification_code} =
        from(
          d in Data.VendorVerifiedDomain,
          where: d.vendor_id == ^vendor_id and d.domain == ^domain
        )
        |> Repo.one()

      if txt_record_exists?(domain, verification_code) do
        Data.VendorVerifiedDomain.new(
          vendor_id: vendor_id,
          domain: domain,
          verification_code: nil,
          verified: true
        )
        |> Repo.insert!(
          on_conflict: {:replace, [:verification_code, :verified]},
          conflict_target: [:vendor_id, :domain]
        )
      end

      res =
        from(
          d in Data.VendorVerifiedDomain,
          where: d.vendor_id == ^vendor_id
        )
        |> Repo.all()

      Process.sleep(1000)

      ok_json(conn, res |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  delete "/:vendor_id/verified_domains/:domain" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      from(
        d in Data.VendorVerifiedDomain,
        where: d.vendor_id == ^vendor_id and d.domain == ^domain
      )
      |> Repo.one()
      |> Repo.delete!()

      res =
        from(
          d in Data.VendorVerifiedDomain,
          where: d.vendor_id == ^vendor_id
        )
        |> Repo.all()

      ok_json(conn, res |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  get "/:vendor_id/integrations" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "reader") do
      workspaces = vendor_workspaces(vendor_id)
      workspace_ids = workspaces |> Enum.map(& &1.id)

      res =
        workspace_ids
        |> Enum.map(fn workspace_id ->
          workspace = Repo.Workspace.get(workspace_id)

          %{
            workspace_id: workspace_id,
            integrations:
              Repo.Workspace.get_integrations(workspace.id)
              |> Enum.map(fn integration ->
                integration_to_data(integration, workspace)
              end)
          }
        end)

      ok_json(conn, res |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  get "/:vendor_id/onboarding_checklist" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      fogbender_workspace_id = Fog.env(:fogbender_workspace_id)
      fogbender_workspace = Repo.Workspace.get(fogbender_workspace_id)

      user_messages_in_fogbender_support_count =
        from(
          c in Data.Customer,
          where: c.external_uid == ^vendor_id,
          where: c.vendor_id == ^fogbender_workspace.vendor_id,
          join: h in Data.Helpdesk,
          on: h.customer_id == c.id,
          join: r in Data.Room,
          on: r.helpdesk_id == h.id,
          join: m in Data.Message,
          on: m.room_id == r.id and not is_nil(m.from_user_id),
          select: count()
        )
        |> Repo.one()

      user_messages_in_vendor_support_count =
        from(
          c in Data.Customer,
          where: c.vendor_id == ^vendor_id,
          join: h in Data.Helpdesk,
          on: h.customer_id == c.id,
          join: r in Data.Room,
          on: r.helpdesk_id == h.id,
          join: m in Data.Message,
          on: m.room_id == r.id and not is_nil(m.from_user_id),
          select: count()
        )
        |> Repo.one()

      agent_invites_count =
        from(
          i in Data.VendorAgentInvite,
          where: i.vendor_id == ^vendor_id,
          select: count()
        )
        |> Repo.one()

      agents_in_vendor_count =
        from(a in Data.VendorAgentRole,
          where: a.vendor_id == ^vendor_id,
          where: a.role in ["owner", "admin", "agent", "reader"],
          select: count()
        )
        |> Repo.one()

      res = %{
        posted_in_fogbender_support: (user_messages_in_fogbender_support_count || 0) > 0,
        users_posted_in_vendor_support: (user_messages_in_vendor_support_count || 0) > 0,
        agent_invited: (agent_invites_count || 0) > 0,
        invited_agent_joined: (agents_in_vendor_count || 0) > 1
      }

      ok_json(conn, res |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  defp role_at_or_above(role, "reader"),
    do: Enum.member?(["reader", "agent", "admin", "owner"], role)

  defp role_at_or_above("agent", "agent"), do: true
  defp role_at_or_above("admin", "agent"), do: true
  defp role_at_or_above("owner", "agent"), do: true
  defp role_at_or_above(_, "agent"), do: false

  defp role_at_or_above("admin", "admin"), do: true
  defp role_at_or_above("owner", "admin"), do: true
  defp role_at_or_above(_, "admin"), do: false

  defp role_at_or_above("owner", "owner"), do: true
  defp role_at_or_above(_, "owner"), do: false

  defp our_role(conn, vendor_id) do
    our_agent_id = conn.assigns[:agent_id]

    case Data.VendorAgentRole
         |> Repo.get_by(agent_id: our_agent_id, vendor_id: vendor_id) do
      nil ->
        nil

      %Data.VendorAgentRole{:role => role} ->
        role
    end
  end

  defp new_role(conn) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, %{"role" => new_role}} = Jason.decode(data)
    {new_role, conn}
  end

  defp old_role(vendor_id, agent_id) do
    old =
      Data.VendorAgentRole
      |> Repo.get_by!(agent_id: agent_id, vendor_id: vendor_id)

    {old, old.role}
  end

  defp num_owners(vendor_id) do
    from(
      r in Data.VendorAgentRole,
      where: r.vendor_id == ^vendor_id
    )
    |> Repo.all()
    |> Enum.filter(&(&1.role == "owner"))
    |> length
  end

  defp bad_request_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(400, data)
  end

  defp forbid(conn, message \\ "") do
    conn |> send_resp(403, message)
  end

  defp ok_no_content(conn) do
    conn |> send_resp(204, "")
  end

  defp ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  defp to_unix(nil), do: nil
  defp to_unix(us), do: Utils.to_unix(us)

  def txt_record_exists?(domain, value) do
    # (authoritative nameservers won't have stale data)
    nameservers =
      :inet_res.lookup(domain |> Kernel.to_charlist(), :in, :ns)
      |> Enum.map(fn ns ->
        {:ok, {_, _, _, _, _, [ip_addr]}} = :inet_res.gethostbyname(ns)
        {ip_addr, 53}
      end)

    records =
      :inet_res.lookup(domain |> Kernel.to_charlist(), :in, :txt, nameservers: nameservers)

    value = value |> Kernel.to_charlist()

    Enum.any?(records, &(&1 == [value]))
  end

  defp integration_to_data(%Data.WorkspaceIntegration{} = integration, workspace) do
    case integration do
      %Data.WorkspaceIntegration{type: "gitlab"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "base_url" => i.specifics["gitlab_url"],
          "project_id" => i.project_id,
          "project_name" => Integration.GitLab.name(i),
          "project_path" => i.specifics["project_path"],
          "project_url" => Integration.GitLab.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.GitLab.integration_tag_name(i)
        }

      %Data.WorkspaceIntegration{type: "linear"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => Integration.Linear.name(i),
          "project_url" => Integration.Linear.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => ":linear:#{i.project_id}"
        }

      %Data.WorkspaceIntegration{type: "github"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          # not optional
          "project_id" => i.project_id,
          "repository_id" => i.project_id,
          "project_name" => Integration.GitHub.name(i),
          "project_url" => Integration.GitHub.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.GitHub.integration_tag_name(i)
        }

      %Data.WorkspaceIntegration{type: "asana"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          # not optional
          "project_id" => i.project_id,
          "repository_id" => i.project_id,
          "project_name" => Integration.Asana.name(i),
          "project_url" => Integration.Asana.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.Asana.integration_tag_name(i)
        }

      %Data.WorkspaceIntegration{type: "jira"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => Integration.Jira.name(i),
          "jira_url" => Integration.Jira.url(i),
          "jira_user" => i.specifics["jira_user"],
          "token" => i.specifics["token"],
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.Jira.integration_tag_name(i)
        }

      %Data.WorkspaceIntegration{type: "height"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => Integration.Height.name(i),
          "project_url" => Integration.Height.url(i),
          "userInfo" => i.specifics["user_info"],
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.Height.integration_tag_name(i)
        }

      %Data.WorkspaceIntegration{type: "trello"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => Integration.Trello.name(i),
          "project_url" => Integration.Trello.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.Trello.integration_tag_name(i),
          "webhook_id" => i.specifics["webhook_id"]
        }

      %Data.WorkspaceIntegration{type: "slack"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => Slack.Agent.name(i),
          "project_url" => Slack.Agent.url(i),
          "userInfo" => i.specifics["user_info"],
          "inserted_at" => i.inserted_at,
          "meta_tag" => Slack.Agent.integration_tag_name(i),
          "shared_channel_helpdesk_associations" =>
            i.specifics["shared_channel_helpdesk_associations"]
        }

      %Data.WorkspaceIntegration{type: "msteams"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => MsTeams.name(i),
          "project_url" => MsTeams.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => MsTeams.integration_tag_name(i)
        }

      %Data.WorkspaceIntegration{type: "slack-customer"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "project_name" => Slack.Customer.name(i),
          "project_url" => Slack.Customer.url(i),
          "inserted_at" => i.inserted_at,
          "meta_tag" => Slack.Customer.integration_tag_name(i),
          "aggressive_ticketing" => i.specifics["aggressive_ticketing"]
        }

      %Data.WorkspaceIntegration{type: "ai"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "inserted_at" => i.inserted_at,
          "meta_tag" => Ai.integration_tag_name(i),
          "prompts" => i.specifics["prompts"]
        }

      %Data.WorkspaceIntegration{type: "pagerduty"} = i ->
        %{
          "workspace_id" => workspace.id,
          "id" => "#{i.id}",
          "type" => i.type,
          "project_id" => i.project_id,
          "userInfo" => i.specifics["user_info"],
          "inserted_at" => i.inserted_at,
          "meta_tag" => Integration.PagerDuty.integration_tag_name(i),
          "agent_group" => i.specifics["agent_group"],
          "schedule_name" => i.specifics["schedule_name"]
        }

      i ->
        %{
          "id" => "#{i.id}",
          "type" => i.type
        }
    end
  end

  defp agent_to_data(a, vendor_id) do
    %{
      id: a.id,
      email: a.email,
      name: a.name,
      role:
        a.vendors
        |> Enum.filter(&(&1.vendor_id == vendor_id))
        |> Enum.map(& &1.role)
        |> Enum.at(0),
      image_url: a.image_url,
      inserted_at: a.inserted_at,
      tags: a.tags |> Enum.map(&Api.Event.Room.tag(&1.tag))
    }
  end

  defp vendor_workspaces(vendor_id) do
    Ecto.Query.from(
      w in Data.Workspace,
      join: v in assoc(w, :vendor),
      where: is_nil(v.deleted_at),
      where: w.vendor_id == ^vendor_id and is_nil(w.deleted_at)
    )
    |> Repo.all()
    |> Enum.map(fn r ->
      %{
        r
        | inserted_at: to_unix(r.inserted_at),
          updated_at: to_unix(r.updated_at),
          deleted_at: to_unix(r.deleted_at)
      }
    end)
  end

  defp count_used_seats(vendor_id) do
    [count_used_seats] =
      from(
        var in Data.VendorAgentRole,
        join: v in Data.Vendor,
        on: v.id == var.vendor_id,
        where: var.vendor_id == ^vendor_id,
        where: var.role in ["owner", "admin", "agent"],
        select: count(var.agent_id)
      )
      |> Repo.all()

    count_used_seats
  end

  defp update_billing(vendor_id) do
    # TODO: this should be done as an async task so that we don't crash the request that triggered update_billing and so that we can retry it if it fails
    free_seats =
      from(
        v in Data.Vendor,
        where: v.id == ^vendor_id,
        select: v.free_seats
      )
      |> Repo.one()

    count_used_seats = count_used_seats(vendor_id)

    stripe_customer_ids =
      from(
        c in Data.VendorStripeCustomer,
        where: c.vendor_id == ^vendor_id,
        select: c.stripe_customer_id
      )
      |> Repo.all()

    subscriptions =
      stripe_customer_ids
      |> Enum.flat_map(fn stripe_customer_id ->
        {:ok, %{"data" => subscriptions}} = Fog.Stripe.Api.get_subscriptions(stripe_customer_id)

        subscriptions
      end)

    subscription =
      subscriptions
      |> Enum.find(fn s ->
        s["status"] === "active" && is_nil(s["canceled_at"])
      end)

    subscription =
      if !subscription do
        subscriptions |> Enum.find(fn s -> s["status"] === "active" end)
      else
        subscription
      end

    subscription =
      if !subscription do
        subscriptions |> Enum.at(0)
      else
        subscription
      end

    if subscription && count_used_seats - free_seats >= 0 do
      %{"items" => %{"data" => [subscription_item]}} = subscription

      case Fog.Stripe.Api.set_subscription_plan_quantity(
             subscription_item["id"],
             count_used_seats - free_seats
           ) do
        {:ok, _} ->
          :ok

        err ->
          Logger.error("Subscription / billing update error: #{inspect(err)}")
          :ok
      end
    else
      :ok
    end
  end

  defp billing(conn, vendor_id) do
    subscriptions =
      from(
        c in Data.VendorStripeCustomer,
        where: c.vendor_id == ^vendor_id
      )
      |> Repo.all()
      |> Enum.map(fn %{stripe_customer_id: stripe_customer_id} ->
        case Fog.Stripe.Api.get_customer(stripe_customer_id) do
          {:ok, %{"deleted" => true}} ->
            from(
              c in Data.VendorStripeCustomer,
              where: c.vendor_id == ^vendor_id,
              where: c.stripe_customer_id == ^stripe_customer_id
            )
            |> Repo.delete_all()

            nil

          {:ok,
           %{
             "created" => created_ts_sec,
             "email" => email,
             "name" => name
           }} ->
            %{"url" => portal_session_url} =
              Fog.Stripe.Api.create_portal_session(stripe_customer_id)

            {:ok, %{"data" => subscriptions}} =
              Fog.Stripe.Api.get_subscriptions(stripe_customer_id)

            case subscriptions do
              [] ->
                from(
                  c in Data.VendorStripeCustomer,
                  where: c.vendor_id == ^vendor_id,
                  where: c.stripe_customer_id == ^stripe_customer_id
                )
                |> Repo.delete_all()

                nil

              [subscription] ->
                %{
                  "id" => subscription_id,
                  "current_period_end" => period_end_ts_sec,
                  "cancel_at" => cancel_at_ts_sec,
                  "canceled_at" => canceled_at_ts_sec,
                  "status" => status,
                  "quantity" => quantity
                } = subscription

                %{
                  id: subscription_id,
                  email: email,
                  name: name,
                  created_ts_sec: created_ts_sec,
                  portal_session_url: portal_session_url,
                  period_end_ts_sec: period_end_ts_sec,
                  cancel_at_ts_sec: cancel_at_ts_sec,
                  canceled_at_ts_sec: canceled_at_ts_sec,
                  status: status,
                  quantity: quantity
                }
            end
        end
      end)
      |> Enum.filter(&(not is_nil(&1)))

    paid_seats = subscriptions |> Enum.map(& &1.quantity) |> Enum.sum()

    free_seats =
      from(
        v in Data.Vendor,
        where: v.id == ^vendor_id,
        select: v.free_seats
      )
      |> Repo.one()

    used_seats = count_used_seats(vendor_id)

    unpaid_seats =
      case used_seats - paid_seats - free_seats do
        seats when seats >= 0 ->
          seats

        _ ->
          0
      end

    delinquent_seats =
      subscriptions
      |> Enum.filter(&(&1.status in ["past_due", "incomplete", "incomplete_expired", "unpaid"]))
      |> Enum.map(& &1.quantity)
      |> Enum.sum()

    minimum_paid_seats = used_seats - free_seats
    active_paid_seats = paid_seats - delinquent_seats
    delinquent = active_paid_seats < minimum_paid_seats

    {:ok, %{"unit_amount" => price_per_seat}} = Fog.Stripe.Api.get_price()

    ok_json(
      conn,
      %{
        delinquent: delinquent,
        unpaid_seats: unpaid_seats,
        paid_seats: paid_seats,
        free_seats: free_seats,
        used_seats: used_seats,
        price_per_seat: price_per_seat,
        subscriptions: subscriptions
      }
      |> Jason.encode!(pretty: true)
    )
  end

  defp is_stripe_configured() do
    nil in [
      Fog.env(:stripe_public_key),
      Fog.env(:stripe_secret_key),
      Fog.env(:stripe_price_id)
    ] === false
  end
end
