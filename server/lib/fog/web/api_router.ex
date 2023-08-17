defmodule Fog.Web.APIRouter do
  require Logger
  require Ecto.Query.API

  import Ecto.Query, only: [from: 2, where: 3]

  use Plug.Router

  alias Fog.{Ai, Api, Data, Integration, Repo, Mailer, Merge, Slack, Web, Utils}
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

  get "/vendors/:vendor_id/agents" do
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

  get "/vendors/:vendor_id/groups" do
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

  post "/vendors/:vendor_id/groups" do
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

  post "/vendors/:vendor_id/groups/:name" do
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

  delete "/vendors/:vendor_id/groups/:name" do
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

  post "/vendors/:vendor_id/create-checkout-session" do
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

  post "/vendors/:vendor_id/set-stripe-session-id" do
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

  post "/vendors/:vendor_id/cancel-subscription" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      subscription_id = conn.params["subscriptionId"]
      :ok = Fog.Stripe.Api.delete_subscription(subscription_id)

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  get "/vendors/:vendor_id/billing" do
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

  post "/workspaces/:workspace_id/get-merge-link-token" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id) |> Repo.preload(:vendor)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      end_user_origin_id = conn.params["endUserOriginId"]

      case {Fog.env(:merge_access_key), end_user_origin_id} do
        {nil, _} ->
          forbid(conn)

        {_, nil} ->
          forbid(conn)

        {_access_key, end_user_origin_id} ->
          ok_json(
            conn,
            Jason.encode!(Merge.Api.link_token(workspace, end_user_origin_id))
          )
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/set-merge-public-token" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id) |> Repo.preload(:vendor)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, data} = Jason.decode(data)

      end_user_origin_id = data["endUserOriginId"]
      public_token = data["publicToken"]
      linked_accounts = Merge.Api.linked_accounts([end_user_origin_id])

      linked_account =
        linked_accounts
        |> Enum.find(fn
          %{"end_user_origin_id" => ^end_user_origin_id} -> true
          _ -> false
        end)

      case {linked_account, public_token} do
        {nil, _} ->
          send_resp(conn, 404, "Not linked accounts found for #{end_user_origin_id}")

        {_, nil} ->
          send_resp(conn, 400, %{error: %{missing_value: "publicToken"}} |> Jason.encode!())

        {linked_account, public_token} ->
          account_token = Merge.Api.account_token(public_token)

          %{
            "id" => merge_id,
            "integration" => %{
              "slug" => provider_type
            }
          } = linked_account

          remote_id =
            case provider_type do
              "hubspot" ->
                %{"hub_id" => remote_id} = Merge.Api.token_info(provider_type, account_token)
                remote_id

              "salesforce" ->
                %{
                  "response" => %{
                    "soapenv:Envelope" => %{
                      "soapenv:Body" => %{
                        "queryResponse" => %{
                          "result" => %{"records" => records}
                        }
                      }
                    }
                  }
                } = Merge.Api.token_info(provider_type, account_token)

                records |> Enum.find_value(& &1["sf:Domain"])
            end

          true = not is_nil(remote_id)

          specifics = %{
            "end_user_origin_id" => end_user_origin_id,
            "account_token" => account_token,
            "type" => provider_type,
            "driver" => "merge",
            "crm_id" => remote_id,
            "merge_id" => merge_id,
            "remote_id" => "#{remote_id}"
          }

          try do
            {:ok, _} =
              Repo.Integration.add(workspace, provider_type, "#{remote_id}", specifics, false)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error(Exception.format(:error, e, __STACKTRACE__))
              forbid(conn)
          end

          ok_no_content(conn)
      end
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/merge-links" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      integrations =
        from(
          e in Data.WorkspaceIntegration,
          where: e.workspace_id == ^workspace_id,
          where: json_extract_path(e.specifics, ["driver"]) == "merge",
          where: not is_nil(json_extract_path(e.specifics, ["end_user_origin_id"])),
          where: not is_nil(json_extract_path(e.specifics, ["account_token"]))
        )
        |> Repo.all()

      end_user_origin_ids =
        integrations
        |> Enum.map(fn %{specifics: %{"end_user_origin_id" => end_user_origin_id}} ->
          end_user_origin_id
        end)
        |> Enum.join(",")

      remote_id = fn merge_id ->
        integration = integrations |> Enum.find(fn i -> i.specifics["merge_id"] === merge_id end)
        integration.specifics["remote_id"]
      end

      linked_accounts =
        case end_user_origin_ids do
          "" ->
            []

          _ ->
            Merge.Api.linked_accounts(end_user_origin_ids)
        end
        |> Enum.map(fn linked_account ->
          Map.merge(linked_account, %{"remote_id" => remote_id.(linked_account["id"])})
        end)

      ok_json(conn, linked_accounts |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/merge-links/:end_user_origin_id" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      integration = merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id})

      case integration do
        nil ->
          send_resp(conn, 404, "Not found")

        _ ->
          %{"account_token" => account_token} = integration.specifics
          account_details = Merge.Api.account_details(account_token)
          ok_json(conn, account_details |> Jason.encode!(pretty: true))
      end
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/merge-links/:end_user_origin_id/accounts" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      integration = merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id})

      %{
        "account_token" => account_token
      } = integration.specifics

      accounts = Merge.Api.accounts(account_token)

      ok_json(conn, accounts |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/merge-links/:end_user_origin_id/:operation" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "delete-account" ->
          integration = merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id})
          %{"account_token" => account_token} = integration.specifics

          :ok = Merge.Api.delete_account(account_token)

          merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id})
          |> Repo.delete!()

          ok_no_content(conn)

        "unassign-customer-from-crm-account" ->
          integration = merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id})

          %{
            "type" => crm_type,
            "remote_id" => crm_remote_id
          } = integration.specifics

          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)

          customer_id = data["customerId"]
          crm_remote_account_id = data["crmRemoteAccountId"]
          crm_account_id = data["crmAccountId"]

          case {customer_id, crm_remote_account_id, crm_account_id} do
            {nil, _, _} ->
              send_resp(
                conn,
                400,
                %{error: %{missing_parameter: "customerId"}} |> Jason.encode!()
              )

            {_, nil, _} ->
              send_resp(
                conn,
                400,
                %{error: %{missing_parameter: "crmRemoteAccountId"}} |> Jason.encode!()
              )

            {_, _, nil} ->
              send_resp(
                conn,
                400,
                %{error: %{missing_parameter: "crmAccountId"}} |> Jason.encode!()
              )

            {_, _, _} ->
              params = [
                vendor_id: workspace.vendor_id,
                customer_id: customer_id,
                crm_id: integration.project_id,
                crm_remote_id: crm_remote_id,
                crm_type: crm_type,
                crm_remote_account_id: crm_remote_account_id
              ]

              Data.CustomerCrm
              |> Repo.get_by(params)
              |> Repo.delete!()

              ok_no_content(conn)
          end

        "assign-customer-to-crm-account" ->
          integration = merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id})

          %{
            "type" => crm_type,
            "remote_id" => crm_remote_id
          } = integration.specifics

          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          customer_id = data["customerId"]
          crm_remote_account_id = data["crmRemoteAccountId"]
          crm_account_id = data["crmAccountId"]

          case {customer_id, crm_remote_account_id, crm_account_id} do
            {nil, _, _} ->
              send_resp(
                conn,
                400,
                %{error: %{missing_parameter: "customerId"}} |> Jason.encode!()
              )

            {_, nil, _} ->
              send_resp(
                conn,
                400,
                %{error: %{missing_parameter: "crmRemoteAccountId"}} |> Jason.encode!()
              )

            {_, _, nil} ->
              send_resp(
                conn,
                400,
                %{error: %{missing_parameter: "crmAccountId"}} |> Jason.encode!()
              )

            {_, _, _} ->
              struct =
                Data.CustomerCrm.new(%{
                  vendor_id: workspace.vendor_id,
                  customer_id: customer_id,
                  crm_id: integration.project_id,
                  crm_remote_id: crm_remote_id,
                  crm_type: crm_type,
                  crm_remote_account_id: crm_remote_account_id,
                  crm_account_id: crm_account_id
                })

              res =
                struct
                |> Repo.insert(
                  on_conflict: {:replace, [:crm_remote_account_id, :crm_account_id]},
                  conflict_target: [:vendor_id, :crm_remote_id, :crm_type, :customer_id]
                )

              case res do
                {:ok, %Data.CustomerCrm{}} ->
                  ok_no_content(conn)

                {:error,
                 %Ecto.Changeset{
                   errors: [
                     vendor_id:
                       {"has already been taken",
                        [
                          constraint: :unique,
                          constraint_name: "one_per_customer_uq_index"
                        ]}
                   ],
                   valid?: false
                 }} ->
                  conflict_record =
                    from(
                      c in Data.CustomerCrm,
                      where:
                        c.vendor_id == ^workspace.vendor_id and
                          c.crm_id == ^integration.project_id and c.crm_type == ^crm_type and
                          c.crm_remote_account_id == ^crm_remote_account_id
                    )
                    |> Fog.Repo.one()
                    |> from_crm()

                  send_resp(
                    conn,
                    400,
                    %{error: %{conflictRecord: conflict_record}} |> Jason.encode!()
                  )
              end
          end

        _ ->
          send_resp(conn, 400, %{error: %{unknown_operation: operation}} |> Jason.encode!())
      end
    else
      forbid(conn)
    end
  end

  post "/vendors/:vendor_id/agents/:agent_id" do
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

  delete "/vendors/:vendor_id/customers/:customer_id" do
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

  delete "/vendors/:vendor_id/agents/:agent_id" do
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

  get "/agents/me" do
    id = conn.assigns[:agent_id]

    user =
      Data.Agent
      |> Repo.get(id)

    data =
      user
      |> Jason.encode!(pretty: true)

    # default workspace used to support customers of Fogbender
    workspace_id = Fog.env(:fogbender_workspace_id)

    %Fog.Data.Workspace{
      signature_secret: signature_secret
    } = Fog.Data.Workspace |> Fog.Repo.get!(workspace_id)

    # user_hmac = Fog.UserSignature.hmac_digest(id, signature_secret)
    user_paseto = Fog.UserSignature.paseto_encrypt(%{userId: id}, signature_secret)
    # user_jwt = Fog.UserSignature.jwt_sign(id, signature_secret)

    # to extends Data.Agent on the output
    data =
      Jason.decode!(data)
      # |> Map.merge(%{widget_hmac: user_hmac, widget_paseto: user_paseto, widget_jwt: user_jwt})
      |> Map.merge(%{widget_paseto: user_paseto})
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  get "/fogbender" do
    fogbender_workspace_id = Fog.env(:fogbender_workspace_id)

    {:ok, fogbenderWidgetId} = Repo.Workspace.to_widget_id(fogbender_workspace_id)

    data =
      %{
        fogbenderWidgetId: fogbenderWidgetId
      }
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  get "/agents/:id" do
    throw(:crash)

    data =
      Data.Agent
      |> Repo.get(id)
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  get "/vendors/:vendor_id/workspaces" do
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

  post "/vendors/:vendor_id/workspaces" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, workspace} = Jason.decode(data)
      {:ok, new_workspace_id} = Snowflake.next_id()
      {:ok, new_internal_helpdesk_id} = Snowflake.next_id()
      {:ok, new_internal_customer_id} = Snowflake.next_id()
      new_workspace_name = workspace["name"]
      new_workspace_description = workspace["description"]
      new_workspace_triage_name = workspace["triage_name"] || "Triage"

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

  post "/vendors/:vendor_id/workspaces/:workspace_id" do
    our_role = our_role(conn, vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, workspace} = Jason.decode(data)
      name = workspace["name"]
      description = workspace["description"]
      triage_name = workspace["triageName"]

      old =
        from(w in Data.Workspace,
          where: w.id == ^workspace_id and w.vendor_id == ^vendor_id
        )
        |> Repo.one()

      if old do
        Data.Workspace.update(old,
          name: name,
          description: description,
          triage_name: triage_name
        )
        |> Repo.update!()
      end

      ok_no_content(conn)
    else
      forbid(
        conn,
        %{error: "Must be admin or higher to change workspace settings"}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  delete "/vendors/:vendor_id/workspaces/:workspace_id" do
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

  get "/workspaces/:id" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      data = workspace |> Jason.encode!(pretty: true)
      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/tags" do
    workspace = Repo.Workspace.get(workspace_id)

    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      data = Repo.Workspace.get_tags(workspace.id) |> Enum.map(&Api.Event.Room.tag(&1))

      ok_json(conn, data |> Jason.encode!(pretty: true))
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/integrations" do
    workspace = Repo.Workspace.get(workspace_id)

    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      data =
        Repo.Workspace.get_integrations(workspace.id)
        |> Enum.map(fn integration ->
          integration_to_data(integration, workspace)
        end)
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/feature_flags" do
    data =
      from(
        ff in Data.FeatureFlag,
        select: ff.id
      )
      |> Repo.all()
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  get "/workspaces/:workspace_id/feature_flags" do
    workspace = Repo.Workspace.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      data =
        from(
          wff in Data.WorkspaceFeatureFlag,
          where: wff.workspace_id == ^workspace_id,
          select: wff.feature_flag_id
        )
        |> Repo.all()
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/feature_flags" do
    workspace = Repo.Workspace.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "owner") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, change} = Jason.decode(data)

      ff_to_remove = change["featureFlagToRemove"]
      ff_to_add = change["featureFlagToAdd"]

      if not is_nil(ff_to_remove) do
        Repo.get_by(Data.WorkspaceFeatureFlag,
          workspace_id: workspace_id,
          feature_flag_id: ff_to_remove
        )
        |> Repo.delete!()
      end

      if not is_nil(ff_to_add) do
        Data.WorkspaceFeatureFlag.new(%{
          workspace_id: Fog.Types.WorkspaceId.dump(workspace_id) |> elem(1),
          feature_flag_id: ff_to_add
        })
        |> Repo.insert!()
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/tags" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "agent") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)
      {:ok, tag} = Jason.decode(data)
      new_tag_name = tag["name"]

      _tag = Repo.Tag.create(workspace_id, new_tag_name)

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/customers" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      data =
        helpdesks_query(workspace_id)
        |> Repo.all()
        |> dates_to_unix()
        |> to_customer_ids_in_domain_matches()
        |> with_crms()
        |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/signature_secret" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "agent") do
      data =
        case workspace.signature_type do
          nil ->
            %{error_msg: "signature_not_set"}

          _ ->
            {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace_id)

            data =
              Fog.UserSignature.workspace_signature_with_example(
                workspace.signature_type,
                workspace.signature_secret
              )

            Map.merge(data, %{
              widget_id: widget_id,
              forward_email_address: Repo.Workspace.forward_email_address(workspace_id)
            })
        end

      data = data |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/feature_options" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "agent") do
      data = Repo.FeatureOption.get(workspace) |> Jason.encode!()
      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/feature_options" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)
    our_id = conn.assigns[:agent_id]

    if role_at_or_above(our_role, "admin") do
      feature_options = conn.params["featureOptions"]

      case feature_options do
        %{"avatar_library_url" => url} ->
          :ok = Repo.FeatureOption.set(workspace, avatar_library_url: url)

        %{"default_group_assignment" => group_name} ->
          rooms =
            from(
              r in Data.Room,
              join: c in assoc(r, :customer),
              on: not like(c.name, "%Cust_Internal_%"),
              join: w in assoc(r, :workspace),
              on: w.id == ^workspace_id,
              where: r.type != "dialog"
            )
            |> Repo.all()

          case Repo.FeatureOption.get(workspace).default_group_assignment do
            nil ->
              # adding
              group_assignee_tag = Repo.Tag.create(workspace_id, ":assignee:group:#{group_name}")

              rooms
              |> Enum.map(fn r ->
                Repo.Room.update_tags(r.id, [group_assignee_tag.id], [], our_id, nil)
              end)
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)

            group_name ->
              # removing
              group_assignee_tag = Repo.Tag.create(workspace_id, ":assignee:group:#{group_name}")

              rooms
              |> Enum.map(fn r ->
                Repo.Room.update_tags(r.id, [], [group_assignee_tag.id], our_id, nil)
              end)
              |> Enum.each(fn r ->
                :ok = Api.Event.publish(r)
              end)
          end

          :ok = Repo.FeatureOption.set(workspace, default_group_assignment: group_name)

          Process.sleep(1000)

        _ ->
          :ok
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/signature_secret" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)

      {:ok, %{"signature_type" => signature_type}} = Jason.decode(data)
      signature_secret = workspace.signature_secret

      # generate new key if old one is too short or not set
      signature_secret =
        if Fog.UserSignature.valid_192bit_secret?(signature_secret || "") do
          signature_secret
        else
          Fog.UserSignature.generate_192bit_secret()
        end

      {:ok, id} = Fog.Types.WorkspaceId.dump(workspace.id)

      %{num_rows: 1} =
        Repo.query!(
          "update workspace set signature_type=$2, signature_secret=$3 where id=$1",
          [id, signature_type, signature_secret]
        )

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/reset_signature_secret" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      {:ok, data, conn} = Plug.Conn.read_body(conn)

      {:ok, %{"signature_secret" => old_signature_secret}} = Jason.decode(data)
      signature_secret = workspace.signature_secret

      # generate new key only if old one is matching. This prevents resetting secret twice and maybe even against XSS attacks
      {:missmatch_secret, ^signature_secret} = {:missmatch_secret, old_signature_secret}

      signature_secret = Fog.UserSignature.generate_192bit_secret()

      {:ok, id} = Fog.Types.WorkspaceId.dump(workspace.id)

      %{num_rows: 1} =
        Repo.query!(
          "update workspace set signature_secret=$2 where id=$1",
          [id, signature_secret]
        )

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/webhook" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "agent") do
      {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace_id)

      data = %{
        webhook_secret: widget_id
      }

      data = data |> Jason.encode!(pretty: true)

      ok_json(conn, data)
    else
      forbid(conn)
    end
  end

  get "/helpdesks/:helpdesk_id/users" do
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

  post "/helpdesks/:helpdesk_id/users/:user_id" do
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

  delete "/helpdesks/:helpdesk_id/users/:user_id" do
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

  post "/helpdesks/:helpdesk_id/users" do
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

  post "/vendors/:vendor_id/workspaces/:workspace_id/csv_import" do
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

  post "/vendors/:vendor_id/workspaces/:workspace_id/customers" do
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

  get "/users/:id" do
    throw(:crash)

    data =
      Data.User
      |> Repo.get(id)
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
  end

  get "/helpdesks/:helpdesk_id" do
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

          Process.sleep(1000)

          ok_json(conn, data)
        else
          forbid(conn)
        end
    end
  end

  post "/customers/:id/:operation" do
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
              send_resp(conn, 400, %{error: %{unknown_operation: operation}} |> Jason.encode!())
          end
        else
          forbid(conn)
        end
    end
  end

  get "/vendors" do
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

  post "/vendors" do
    agent_id = conn.assigns[:agent_id]

    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, vendor} = Jason.decode(data)
    {:ok, new_vendor_id} = Snowflake.next_id()
    new_vendor_name = vendor["name"]

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

  post "/vendors/:vendor_id" do
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

  get "/vendors/:vendor_id" do
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

  delete "/vendors/:vendor_id" do
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

  get "/vendors/:vendor_id/invites" do
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

  post "/invites" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, invite} = Jason.decode(data)

    our_role = our_role(conn, invite["vendor_id"])
    minimum_role = "admin"

    if role_at_or_above(our_role, minimum_role) do
      agent_id = conn.assigns[:agent_id]

      {:ok, invite_id} = Snowflake.next_id()

      code = :crypto.strong_rand_bytes(24) |> Base.url_encode64()

      tx =
        Ecto.Multi.new()
        |> Ecto.Multi.insert(
          :vendor_agent_invite,
          Data.VendorAgentInvite.new(
            invite_id: invite_id,
            vendor_id: invite["vendor_id"],
            email: String.downcase(invite["email"]),
            role: invite["role"],
            from_agent_id: agent_id,
            code: code
          )
        )
        |> Repo.transaction()

      case tx do
        {:ok, %{vendor_agent_invite: _}} ->
          accept_url = "#{Fog.env(:fog_storefront_url)}/admin?code=#{code}"
          html = "To accept your Fogbender invite, click here: #{accept_url}"
          text = html
          email = invite["email"]

          Logger.info("Sending email invite to #{email}")

          Bamboo.Email.new_email(
            to: email,
            from: Mailer.source(),
            subject: "Your Fogbender invite",
            html_body: html,
            text_body: text
          )
          |> Mailer.send()

          ok_no_content(conn)

        {:error, :vendor_agent_invite, %Ecto.Changeset{errors: errors}, _} ->
          error =
            errors
            |> Enum.reduce(
              %{error: "unknown error"},
              fn
                {:email, _email_error}, _ ->
                  %{error: %{code: "invalid_email"}}

                _, acc ->
                  acc
              end
            )

          bad_request_json(conn, error |> Jason.encode!(pretty: true))
      end
    else
      forbid_json(
        conn,
        %{error: %{code: "permission", minimum_role: minimum_role, current_role: our_role}}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  delete "/invites/:invite_id" do
    invite = Data.VendorAgentInvite |> Repo.get_by(invite_id: invite_id)
    our_role = our_role(conn, invite.vendor_id)

    if role_at_or_above(our_role, "admin") do
      if invite do
        invite
        |> Data.VendorAgentInvite.update(deleted_at: DateTime.utc_now())
        |> Repo.update!()
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/invites/:invite_id" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, new_invite} = Jason.decode(data)
    role = new_invite["role"]

    invite = Data.VendorAgentInvite |> Repo.get_by(invite_id: invite_id)
    our_role = our_role(conn, invite.vendor_id)

    if role_at_or_above(our_role, "admin") do
      if invite do
        invite
        |> Data.VendorAgentInvite.update(role: role)
        |> Repo.update!()
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  get "/vendor_invites" do
    our_agent_id = conn.assigns[:agent_id]

    data =
      from(
        i in Data.VendorAgentInvite,
        where:
          is_nil(i.deleted_at) and
            i.email in subquery(
              from(a in Data.Agent, select: a.email, where: a.id == ^our_agent_id)
            )
      )
      |> Repo.all()
      |> Repo.preload([:from_agent, :vendor])

    ok_json(conn, data |> Jason.encode!())
  end

  get "/vendor_invites/:code" do
    our_agent_id = conn.assigns[:agent_id]

    data =
      from(
        i in Data.VendorAgentInvite,
        where:
          is_nil(i.deleted_at) and
            (i.code == ^code or
               i.email in subquery(
                 from(a in Data.Agent, select: a.email, where: a.id == ^our_agent_id)
               ))
      )
      |> Repo.all()
      |> Repo.preload([:from_agent, :vendor])

    ok_json(conn, data |> Jason.encode!())
  end

  post "/vendor_invites/accept" do
    # anyone who knows the code can accept it
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    our_agent_id = conn.assigns[:agent_id]

    name = from(a in Data.Agent, select: a.name, where: a.id == ^our_agent_id) |> Repo.one()

    code = data["code"]
    invite = Data.VendorAgentInvite |> Repo.get_by(code: code)
    invite = invite |> Repo.preload([:from_agent, :vendor])

    text =
      "#{invite.email}, now known as #{name}, has accepted your invitation to join #{invite.vendor.name} on Fogbender."

    conn = Web.AcceptInvite.check_invite_code(conn, code)

    Bamboo.Email.new_email(
      to: invite.from_agent.email,
      from: Mailer.source(),
      subject: "Invitation accepted",
      text_body: text
    )
    |> Mailer.send()

    :ok = update_billing(invite.vendor_id)

    if conn.halted do
      conn
    else
      ok_no_content(conn)
    end
  end

  post "/vendor_invites/decline" do
    # anyone can decline the invite if they know the code

    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    code = data["code"]

    invite = Data.VendorAgentInvite |> Repo.get_by(code: code)

    if invite do
      invite
      |> Data.VendorAgentInvite.update(deleted_at: DateTime.utc_now())
      |> Repo.update!()

      invite = invite |> Repo.preload([:from_agent, :vendor])

      text =
        "#{invite.email} has declined your invitation to join #{invite.vendor.name} on Fogbender."

      Bamboo.Email.new_email(
        to: invite.from_agent.email,
        from: Mailer.source(),
        subject: "Invitation declined",
        text_body: text
      )
      |> Mailer.send()
    end

    ok_no_content(conn)
  end

  post "/token" do
    agent_id = conn.assigns[:agent_id]
    token = Fog.Token.for_agent(agent_id, 10 * 60)

    data =
      %{token: token}
      |> Jason.encode!()

    ok_json(conn, data)
  end

  get "/is_generic/:domain" do
    ok_json(conn, domain |> Fog.Email.GenericDomains.is_generic?() |> Jason.encode!())
  end

  get "/vendors/:vendor_id/verified_domains" do
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

  post "/vendors/:vendor_id/verified_domains" do
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

  post "/vendors/:vendor_id/verified_domains/:domain" do
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

  delete "/vendors/:vendor_id/verified_domains/:domain" do
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

  get "/vendors/:vendor_id/integrations" do
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

  get "/vendors/:vendor_id/onboarding_checklist" do
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

  post "/workspaces/:id/integrations/gitlab/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "check-access" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          project_path = integration["projectPath"]
          access_token = integration["accessToken"]

          case Integration.GitLab.check_access(access_token, project_path) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          project_id = integration["projectId"]
          access_token = integration["accessToken"]
          issue_title = integration["issueTitle"]

          case Integration.GitLab.create_issue(access_token, project_id, issue_title) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          project_id = integration["projectId"]
          access_token = integration["accessToken"]
          issue_iid = integration["issueIid"]
          issue_title = integration["issueTitle"]

          case Integration.GitLab.delete_issue(access_token, project_id, issue_iid) do
            :ok ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-issue-by-name" ->
          get_issue_by_name(workspace.id, "gitlab", conn)

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          project_id = data["projectId"] |> to_string
          project_path = data["projectPath"]
          project_name = data["projectName"]
          project_url = data["projectUrl"]
          gitlab_url = data["gitLabUrl"]
          access_token = data["accessToken"]

          specifics = %{
            "project_id" => project_id,
            "project_path" => project_path,
            "project_name" => project_name,
            "project_url" => project_url,
            "access_token" => access_token,
            "gitlab_url" => gitlab_url
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "gitlab", project_id, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/linear/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "check-access" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]

          case Integration.Linear.check_access(api_key) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-label" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          team_id = integration["teamId"]

          case Integration.Linear.create_label(api_key, team_id) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-label" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          label_id = integration["labelId"]

          case Integration.Linear.delete_label(api_key, label_id) do
            :ok ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          team_id = integration["teamId"]
          webhook_base = integration["webhookUrl"]
          {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)
          webhook_url = "#{webhook_base}/#{widget_id}"

          case Integration.Linear.create_webhook(api_key, team_id, webhook_url, widget_id) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          webhook_id = integration["webhookId"]

          case Integration.Linear.delete_webhook(api_key, webhook_id) do
            :ok ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          issue_title = integration["issueTitle"]
          team_id = integration["teamId"]
          label_id = integration["labelId"]

          case Integration.Linear.create_issue(api_key, team_id, issue_title, label_id) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          issue_id = integration["issueId"]
          issue_title = integration["issueTitle"]

          case Integration.Linear.delete_issue(api_key, issue_id) do
            :ok ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-issue-by-name" ->
          get_issue_by_name(workspace.id, "linear", conn)

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          team_id = data["teamId"]
          team_name = data["teamName"]
          project_url = data["projectUrl"]
          api_key = data["apiKey"]
          fogbender_label_id = data["fogbenderLabelId"]
          webhook_id = data["webhookId"]

          specifics = %{
            "team_id" => team_id,
            "team_name" => team_name,
            "project_url" => project_url,
            "api_key" => api_key,
            "fogbender_label_id" => fogbender_label_id,
            "webhook_id" => webhook_id
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "linear", team_id, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/github/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "get-repositories" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]

          case Integration.GitHub.get_repositories(api_key) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-label" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]

          # repo is like fogbender/fogbender-integration
          repo = integration["repo"]

          case Integration.GitHub.create_label(api_key, repo) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          repo = integration["repo"]
          webhook_base = integration["webhookUrl"]
          {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)
          webhook_url = "#{webhook_base}/#{widget_id}"

          case Integration.GitHub.create_webhook(api_key, repo, webhook_url) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          webhook_id = integration["webhookId"]
          repository_id = integration["repositoryId"]

          case Integration.GitHub.delete_webhook(api_key, repository_id, webhook_id) do
            :ok ->
              ok_no_content(conn)

            {:error, _} ->
              forbid(conn)
          end

        "create-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          issue_title = integration["issueTitle"]
          repo = integration["repo"]

          case Integration.GitHub.create_issue(api_key, repo, issue_title) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          repo = integration["repo"]
          api_key = integration["apiKey"]
          issue_number = integration["issueNumber"]
          issue_title = integration["issueTitle"]

          case Integration.GitHub.close_issue(api_key, repo, issue_number) do
            {:ok, _} ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-issue-by-name" ->
          get_issue_by_name(workspace.id, "github", conn)

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          repository_id = data["repositoryId"]
          repo = data["repo"]
          repository_url = data["repositoryUrl"]
          api_key = data["apiKey"]
          fogbender_label_id = data["fogbenderLabelId"]
          webhook_id = data["webhookId"]

          specifics = %{
            "repository_id" => repository_id,
            "repo" => repo,
            "repository_url" => repository_url,
            "api_key" => api_key,
            "fogbender_label_id" => fogbender_label_id,
            "webhook_id" => webhook_id
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "github", repo, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/asana/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "get-projects" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]

          case Integration.Asana.get_projects(api_key) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-tag" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          project_id = integration["projectId"]

          case Integration.Asana.create_tag(api_key, project_id) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-tag" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          tag_id = integration["tagId"]

          case Integration.Asana.delete_tag(api_key, tag_id) do
            :ok ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          project_id = integration["projectId"]
          webhook_base = integration["webhookUrl"]
          {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)
          webhook_url = "#{webhook_base}/#{widget_id}"

          case Integration.Asana.create_webhook(api_key, project_id, webhook_url) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          webhook_id = integration["webhookId"]

          case Integration.Asana.delete_webhook(api_key, webhook_id) do
            :ok ->
              ok_no_content(conn)

            {:error, _} ->
              forbid(conn)
          end

        "create-task" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          task_title = integration["taskTitle"]
          project_id = integration["projectId"]
          tag_id = integration["tagId"]

          case Integration.Asana.create_task(api_key, project_id, task_title, tag_id) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-task" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, integration} = Jason.decode(data)
          api_key = integration["apiKey"]
          task_id = integration["taskId"]
          task_title = integration["taskTitle"]

          case Integration.Asana.delete_task(api_key, task_id) do
            :ok ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: task_title, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-task-by-id" ->
          # TODO Asana's webhooks are very slow, need better way to sync with incoming event
          get_task_by_id(workspace.id, "asana", conn, 5)

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          project_id = data["projectId"]
          project_name = data["projectName"]
          api_key = data["apiKey"]
          fogbender_tag_id = data["fogbenderTagId"]
          webhook_id = data["webhookId"]

          {:ok, body} = Integration.Asana.get_project(api_key, project_id)

          specifics = %{
            "project_id" => project_id,
            "project_name" => project_name,
            "project_url" => body["permalink_url"],
            "api_key" => api_key,
            "fogbender_tag_id" => fogbender_tag_id,
            "webhook_id" => webhook_id
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "asana", project_id, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/jira/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "check-access" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          jira_url = data["jiraUrl"]
          jira_user = data["jiraUser"]
          token = data["apiToken"]
          project_id = data["projectKey"]

          case Integration.Jira.check_access(jira_url, jira_user, token, project_id) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          jira_url = data["jiraUrl"]
          jira_user = data["jiraUser"]
          token = data["apiToken"]
          project_id = data["projectKey"]
          issue_title = data["issueTitle"]

          case Integration.Jira.create_issue(jira_url, jira_user, token, project_id, issue_title) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          jira_url = data["jiraUrl"]
          jira_user = data["jiraUser"]
          token = data["apiToken"]
          issue_title = data["issueTitle"]
          issue_id = data["issueId"]

          case Integration.Jira.delete_issue(jira_url, jira_user, token, issue_id) do
            :ok ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-issue-by-name" ->
          get_issue_by_name(workspace.id, "jira", conn)

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          jira_url = data["jiraUrl"]
          jira_user = data["jiraUser"]
          token = data["apiToken"]
          project_id = data["projectKey"]
          project_name = data["projectName"]

          specifics = %{
            "jira_url" => jira_url,
            "jira_user" => jira_user,
            "token" => token,
            "project_url" => "#{jira_url}/browse/#{project_id}",
            "project_name" => project_name
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "jira", project_id, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/height/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "oauth-code" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          oauth_code = data["code"]
          {:ok, data} = Fog.Integration.Height.oauth_code(oauth_code)
          ok_json(conn, data |> Jason.encode!())

        "check-access" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Integration.Height.check_access(access_token) do
            {:ok, data, nil} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-fogbender-list" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Integration.Height.create_fogbender_list(access_token) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)
          fogbender_list_id = data["fogbenderListId"]
          issue_title = data["issueTitle"]

          case Integration.Height.create_task(access_token, fogbender_list_id, issue_title) do
            {:ok, data, _} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)
          task_id = data["taskId"]
          task_name = data["taskName"]

          case Integration.Height.delete_task(access_token, task_id) do
            {:ok, _} ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: task_name, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-issue-by-name" ->
          get_issue_by_name(workspace.id, "height", conn)

        "create-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)
          webhook_url = data["webhookUrl"]

          case Integration.Height.create_webhook(access_token, webhook_url) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, error} ->
              send_resp(conn, 400, Kernel.inspect(error))
          end

        "delete-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)
          webhook_id = data["webhookId"]

          case Integration.Height.delete_webhook(access_token, webhook_id) do
            {:ok, _} ->
              ok_no_content(conn)

            {:error, error} ->
              send_resp(conn, 400, Kernel.inspect(error))
          end

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          project_id = data["projectId"]
          project_name = data["projectName"]
          project_url = data["projectUrl"]
          fogbender_list_id = data["fogbenderListId"]
          user_token = data["userToken"]
          user_info = data["userInfo"]

          {:ok, user_token} = Fog.Integration.OAuth.decrypt(user_token)

          specifics = %{
            "user_token" => user_token,
            "user_info" => user_info,
            "workspace_url" => project_url,
            "workspace_name" => project_name,
            "workspace_id" => project_id,
            "fogbender_list_id" => fogbender_list_id
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "height", project_id, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/trello/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "check-access" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          token = data["token"]

          case Integration.Trello.check_access(token) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-fogbender-list" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          token = data["token"]
          id_board = data["idBoard"]

          case Integration.Trello.create_fogbender_list(token, id_board) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          token = data["token"]
          id_board = data["idBoard"]
          issue_title = data["issueTitle"]

          case Integration.Trello.create_card(token, id_board, issue_title) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "delete-issue" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          token = data["token"]
          card_id = data["cardId"]
          card_name = data["cardName"]

          case Integration.Trello.delete_card(token, card_id) do
            {:ok, _} ->
              internal_hid = Fog.Utils.internal_hid(workspace.id)

              case Data.Room |> Repo.get_by(name: card_name, helpdesk_id: internal_hid) do
                nil ->
                  :ok

                room ->
                  room |> Repo.delete()
              end

              ok_no_content(conn)

            {:error, :not_found} ->
              send_resp(conn, 404, "Not found")

            {:error, :not_authorized} ->
              forbid(conn)
          end

        "get-issue-by-name" ->
          get_issue_by_name(workspace.id, "trello", conn)

        "create-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          token = data["token"]
          webhook_url = data["webhookUrl"]
          id_board = data["idBoard"]

          case Integration.Trello.create_webhook(token, id_board, webhook_url) do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, error} ->
              send_resp(conn, 400, Kernel.inspect(error))
          end

        "delete-webhook" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          token = data["token"]
          webhook_id = data["webhookId"]

          case Integration.Trello.delete_webhook(token, webhook_id) do
            {:ok, _} ->
              ok_no_content(conn)

            {:error, error} ->
              send_resp(conn, 400, Kernel.inspect(error))
          end

        "add-integration" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          project_id = data["projectId"]
          project_name = data["projectName"]
          project_url = data["projectUrl"]
          token = data["token"]
          webhook_id = data["webhookId"]

          specifics = %{
            "token" => token,
            "board_url" => project_url,
            "board_name" => project_name,
            "board_id" => project_id,
            "webhook_id" => webhook_id
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "trello", project_id, specifics)
            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/slack/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "oauth-code" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          oauth_code = data["code"]
          :console.log(oauth_code)
          {:ok, data} = Slack.Api.oauth_code(oauth_code)
          ok_json(conn, data |> Jason.encode!())

        "check-access" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Slack.Api.check_access(access_token) do
            {:ok, data, nil} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-channel" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Slack.Api.create_channel(access_token, "fogbender") do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, e} ->
              Logger.error("Error: #{inspect(e)}")
              forbid(conn)
          end

        "invite-to-channel" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, data} = Jason.decode(data)
          user_token = data["userToken"]
          channel_id = data["channelId"]
          user_id = data["userId"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Slack.Api.invite_user_to_channel(access_token, channel_id, user_id) do
            {:ok, resp} ->
              ok_json(conn, resp |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "add-integration" ->
          case from(
                 i in Data.WorkspaceIntegration,
                 where: i.workspace_id == ^id,
                 where: i.type == "slack"
               )
               |> Repo.all() do
            [] ->
              # XXX: this is a race condition
              {:ok, data, conn} = Plug.Conn.read_body(conn)
              {:ok, data} = Jason.decode(data)
              # teamId
              project_id = data["projectId"]
              project_name = data["projectName"]
              project_url = data["projectUrl"]
              user_token = data["userToken"]
              %{"botUserId" => slack_bot_user_id} = user_info = data["userInfo"]
              channel_id = data["channelId"]

              {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

              specifics = %{
                "access_token" => access_token,
                "user_info" => user_info,
                "team_url" => project_url,
                "team_name" => project_name,
                "team_id" => project_id,
                "linked_channel_id" => channel_id
              }

              try do
                {:ok, _, bot_agent} =
                  Repo.Integration.add(workspace, "slack", project_id, specifics)

                case Repo.SlackAgentMapping.agent_id(project_id, slack_bot_user_id) do
                  %Data.SlackAgentMapping{agent_id: agent_id}
                  when is_nil(agent_id) or agent_id !== bot_agent.id ->
                    %Data.SlackAgentMapping{} =
                      Repo.SlackAgentMapping.create(
                        agent_id: bot_agent.id,
                        slack_team_id: project_id,
                        slack_user_id: slack_bot_user_id
                      )

                  _ ->
                    :ok
                end

                ok_no_content(conn)
              rescue
                e in [Ecto.ConstraintError] ->
                  Logger.error("Error: #{inspect(e)}")
                  send_resp(conn, 409, "Already added")
              end

            _ ->
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/integrations/msteams/:operation" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "enable" ->
          try do
            {:ok, _, _bot_agent} =
              Repo.Integration.add(workspace, "msteams", "MSTC-#{workspace.vendor_id}", %{})

            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              ok_no_content(conn)
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/integrations/slack-customer/:operation" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "enable" ->
          try do
            {:ok, data, conn} = Plug.Conn.read_body(conn)
            {:ok, params} = Jason.decode(data)
            aggressive_ticketing = params["aggressiveTicketing"]

            {:ok, _, _bot_agent} =
              Repo.Integration.add(workspace, "slack-customer", "SC-#{workspace.vendor_id}", %{
                aggressive_ticketing: aggressive_ticketing
              })

            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              ok_no_content(conn)
          end
      end
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/integrations/ai/embeddings_sources" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "reader") do
      res =
        from(
          s in Data.EmbeddingsSource,
          where: s.workspace_id == ^workspace_id,
          where: is_nil(s.deleted_at),
          left_join: p in Data.PromptCluster,
          on: p.source_id == s.id,
          order_by: [desc: s.parent_id],
          group_by: [s.id],
          select: %{
            id: s.id,
            parent_id: s.parent_id,
            status: s.status,
            url: s.url,
            ready: fragment("count(case when ? = 'ready' then 1 end)", p.status),
            fetching: fragment("count(case when ? = 'fetching' then 1 end)", p.status),
            error: fragment("count(case when ? = 'error' then 1 end)", p.status)
          }
        )
        |> Repo.all()
        |> Enum.filter(
          &(&1.fetching + &1.ready > 0 || &1.status !== "ready" || is_nil(&1.parent_id))
        )

      primogenitors = res |> Enum.filter(&is_nil(&1.parent_id))

      tree = embedding_sources_to_tree(primogenitors, res, [])

      ok_json(conn, tree |> Jason.encode!())
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/integrations/ai/:operation" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    get_integration = fn ->
      from(
        i in Data.WorkspaceIntegration,
        where: i.workspace_id == ^workspace_id,
        where: i.type == "ai"
      )
      |> Repo.one()
    end

    if role_at_or_above(our_role, "admin") do
      case operation do
        "new-embeddings-source" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, params} = Jason.decode(data)

          url = params["url"]
          restrict_path = params["restrictPath"] || false

          case URI.parse(url) do
            %URI{scheme: nil} ->
              send_resp(conn, 400, %{error: "missing scheme"} |> Jason.encode!())

            %URI{host: nil} ->
              send_resp(conn, 400, %{error: "missing host"} |> Jason.encode!())

            %URI{authority: "github.com", path: path} ->
              [_, owner, repo | _] = path |> String.split("/")
              issues_url = "https://github.com/#{owner}/#{repo}/issues"

              :ok =
                Ai.FetcherTask.schedule(
                  github_issues_url: issues_url,
                  workspace_id: workspace_id,
                  repo: "#{owner}/#{repo}"
                )

              ok_no_content(conn)

            %URI{} = uri ->
              url =
                uri |> Map.put(:fragment, nil) |> URI.to_string() |> String.trim_trailing("/#")

              Data.EmbeddingsSource.new(
                url: url,
                restrict_path:
                  case restrict_path do
                    false ->
                      nil

                    true ->
                      uri.path
                  end,
                text: "",
                description: "",
                status: "fetching",
                workspace_id: workspace_id,
                deleted_at: nil,
                deleted_by_agent_id: nil
              )
              |> Repo.insert!(
                on_conflict: {:replace, [:deleted_by_agent_id, :deleted_at]},
                conflict_target: [:url, :workspace_id]
              )

              embeddings_source =
                Repo.get_by(Data.EmbeddingsSource, url: url, workspace_id: workspace_id)

              :ok = Ai.FetcherTask.schedule(embeddings_source: embeddings_source)

              ok_no_content(conn)
          end

        "delete-embeddings-source" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, params} = Jason.decode(data)

          id = params["id"]

          s =
            from(
              s in Data.EmbeddingsSource,
              where: s.id == ^id
            )
            |> Repo.one()

          {:ok, _} =
            s
            |> Ecto.Changeset.change(
              deleted_by_agent_id: conn.assigns[:agent_id],
              deleted_at: DateTime.utc_now()
            )
            |> Repo.update()

          Process.sleep(1000)

          ok_no_content(conn)

        "activate-embeddings-source" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, params} = Jason.decode(data)

          id = params["id"]

          s =
            from(
              s in Data.EmbeddingsSource,
              where: s.id == ^id
            )
            |> Repo.one()

          {:ok, _} = s |> Ecto.Changeset.change(status: "fetching") |> Repo.update()

          s =
            from(
              s in Data.EmbeddingsSource,
              where: s.id == ^id
            )
            |> Repo.one()

          :ok = Ai.FetcherTask.schedule(embeddings_source: s)

          Process.sleep(1000)

          ok_no_content(conn)

        "new-prompt" ->
          integration = get_integration.()
          prompts = integration.specifics["prompts"] || []

          new_prompt = %{
            "index" => 0,
            "id" => Ecto.UUID.generate(),
            "command" => "",
            "instruction" => ""
          }

          prompts =
            [new_prompt | prompts]
            |> Enum.with_index(0)
            |> Enum.map(fn {p, index} ->
              %{p | "index" => index}
            end)

          specifics = integration.specifics |> Map.merge(%{"prompts" => prompts})

          %Data.WorkspaceIntegration{} =
            Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

          ok_no_content(conn)

        "disable" ->
          integration = get_integration.() |> Repo.delete!()

          bot = Repo.Agent.get_bot_by_tag_name(workspace_id, Ai.integration_tag_name(integration))

          from(
            r in Data.VendorAgentRole,
            where: r.agent_id == ^bot.id and r.vendor_id == ^workspace.vendor_id
          )
          |> Repo.one()
          |> Repo.delete!()

          ok_no_content(conn)

        "enable" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, params} = Jason.decode(data)
          bot_name = params["botName"]

          prompt = %{
            "index" => 0,
            "id" => Ecto.UUID.generate(),
            "command" => "stop",
            "instruction" =>
              """
              # This is a built-in command
              # Tells bot to abort command execution
              """
              |> String.trim()
          }

          {:ok, _, _bot_agent} =
            Repo.Integration.add(
              workspace,
              "ai",
              "#{workspace.id}",
              %{"prompts" => [prompt]},
              true,
              bot_name
            )

          ok_no_content(conn)

        "set-prompt" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, params} = Jason.decode(data)

          prompt_id = params["id"]
          integration = get_integration.()
          prompts = integration.specifics["prompts"] || []
          instruction = params["instruction"]

          prompts =
            prompts
            |> Enum.map(fn
              %{"id" => ^prompt_id} = prompt ->
                %{prompt | "command" => params["command"], "instruction" => instruction}

              prompt ->
                prompt
            end)

          specifics =
            integration.specifics
            |> Map.merge(%{
              "prompts" => prompts
            })

          %Data.WorkspaceIntegration{} =
            Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

          ok_no_content(conn)

        "delete-prompt" ->
          {:ok, data, conn} = Plug.Conn.read_body(conn)
          {:ok, params} = Jason.decode(data)
          prompt_id = params["id"]

          integration = get_integration.()

          prompts = integration.specifics["prompts"] || []

          case prompt_id do
            nil ->
              send_resp(conn, 400, %{error: %{missing: "id"}} |> Jason.encode!())

            _ ->
              prompts =
                prompts
                |> Enum.filter(fn p -> p["id"] !== prompt_id end)
                |> Enum.with_index(0)
                |> Enum.map(fn {p, index} -> %{p | "index" => index} end)

              specifics =
                integration.specifics
                |> Map.merge(%{
                  "prompts" => prompts
                })

              %Data.WorkspaceIntegration{} =
                Data.WorkspaceIntegration.update(integration, specifics: specifics)
                |> Repo.update!()

              ok_no_content(conn)
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:id/integrations/pagerduty/:operation" do
    workspace = Data.Workspace |> Repo.get(id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case operation do
        "oauth-code" ->
          %Fog.Z.APIPagerdutyOauthCode{
            code: code,
            verifierEncoded: verifierEncoded
          } = Fog.Z.APIPagerdutyOauthCode.from_map!(conn.params)

          %{"verifier" => verifier} = Fog.TokenNew.validate(verifierEncoded)
          {:ok, data} = Fog.Integration.PagerDuty.oauth_code(code, verifier)
          ok_json(conn, data |> Jason.encode!())

        "add-integration" ->
          subdomain = conn.params["subdomain"]
          user_token = conn.params["userToken"]
          user_info = conn.params["userInfo"]

          {:ok, user_token} = Fog.Integration.OAuth.decrypt(user_token)

          specifics = %{
            "user_token" => user_token,
            "user_info" => user_info,
            "subdomain" => subdomain
          }

          try do
            {:ok, _, _} = Repo.Integration.add(workspace, "pagerduty", subdomain, specifics)

            Process.sleep(1000)

            ok_no_content(conn)
          rescue
            e in [Ecto.ConstraintError] ->
              Logger.error("Error: #{inspect(e)}")
              send_resp(conn, 409, "Already added")
          end
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/integrations/:id/:operation" do
    case Integer.parse(id) do
      :error ->
        forbid(conn)

      {integration_id_numeric, _} ->
        integration = Repo.Integration.get(workspace_id, integration_id_numeric)

        if not is_nil(integration) do
          workspace = Data.Workspace |> Repo.get(integration.workspace_id)
          our_role = our_role(conn, workspace.vendor_id)

          if role_at_or_above(our_role, "admin") do
            integration_operation(integration.type, operation, integration, workspace, conn)
          else
            forbid(conn)
          end
        else
          forbid(conn)
        end
    end
  end

  post "/accept_fogvite_code" do
    our_agent_id = conn.assigns[:agent_id]
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    code = data["code"]

    fogvite_code = Data.FogviteCode |> Repo.get(code)

    is_fogvited = Data.Agent |> Repo.get(our_agent_id) |> Data.Agent.is_fogvited?()

    cond do
      is_fogvited ->
        error_json_forbid(
          conn,
          %{error: "Already fogvited"} |> Jason.encode!()
        )

      is_nil(fogvite_code) or fogvite_code.disabled ->
        error_json_not_found(
          conn,
          %{
            error:
              "This code either never existed or was removed. Please get in touch ☝️  if you’d like one."
          }
          |> Jason.encode!()
        )

      true ->
        count =
          Data.Fogvite
          |> where([f], f.fogvite_code == ^code)
          |> Repo.aggregate(:count)

        if count < fogvite_code.limit do
          {:ok, _fogvite} =
            Data.Fogvite.new(
              id: nil,
              sender_agent_id: our_agent_id,
              invite_sent_to_email: "invited by fogvite code",
              accepted_by_agent_id: our_agent_id,
              fogvite_code: code
            )
            |> Repo.insert()

          ok_no_content(conn)
        else
          error_json_forbid(
            conn,
            %{error: "Oops! No more invites left for this code - we'll be in touch!"}
            |> Jason.encode!()
          )
        end
    end
  end

  get "/workspaces/:id/reporting/overview" do
    workspace = Repo.Workspace.get(id)
    our_role = our_role(conn, workspace.vendor_id)
    params = fetch_query_params(conn).params
    start_date = params["startDate"]
    end_date = params["endDate"]
    helpdesk_ids = params["helpdeskIds"]

    {start_date, end_date} =
      case {Integer.parse(start_date), Integer.parse(end_date)} do
        {{start_date, ""}, {end_date, ""}} ->
          {start_date, end_date}

        {{start_date, ""}, :error} ->
          {start_date, nil}

        {:error, {end_date, ""}} ->
          {nil, end_date}

        _ ->
          {nil, nil}
      end

    helpdesk_ids =
      case helpdesk_ids do
        "undefined" ->
          nil

        "" ->
          nil

        v ->
          v |> String.split(",")
      end

    if role_at_or_above(our_role, "reader") do
      ok_json(
        conn,
        Repo.Reporting.overview(id, start_date, end_date, helpdesk_ids) |> Jason.encode!()
      )
    else
      forbid(conn)
    end
  end

  get "verifier" do
    verifier = :crypto.strong_rand_bytes(93) |> Base.url_encode64(padding: false)
    digest = :crypto.hash(:sha256, verifier) |> Base.url_encode64(padding: false)

    # verifier should be threated as a secret
    verifier_encoded = Fog.TokenNew.token(%{verifier: verifier}, 3600)

    ok_json(
      conn,
      %Fog.Z.APICodeChallengeVerifier{codeChallenge: digest, verifierEncoded: verifier_encoded}
      |> Fog.Z.APICodeChallengeVerifier.to_json!()
    )
  end

  match _ do
    send_resp(conn, 404, "Not found")
  end

  defp integration_operation("gitlab", operation, integration, workspace, conn) do
    case operation do
      "update-api-key" ->
        update_api_key("access_token", integration, conn)

      "check-access" ->
        project_path = integration.specifics["project_path"]
        access_token = integration.specifics["access_token"]

        case Integration.GitLab.check_access(access_token, project_path) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "create-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        issue_title = data["issueTitle"]
        access_token = integration.specifics["access_token"]
        project_id = integration.project_id

        case Integration.GitLab.create_issue(access_token, project_id, issue_title, access_token) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        issue_iid = data["issueIid"]
        issue_title = data["issueTitle"]
        project_id = integration.specifics["project_id"]
        access_token = integration.specifics["access_token"]

        case Integration.GitLab.delete_issue(access_token, project_id, issue_iid) do
          :ok ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, :not_found} ->
            send_resp(conn, 404, "Not found")

          {:error, :not_authorized} ->
            forbid(conn)
        end

      "get-issue-by-name" ->
        get_issue_by_name(workspace.id, integration.type, conn)

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("linear", operation, integration, workspace, conn) do
    api_key = integration.specifics["api_key"]
    team_id = integration.specifics["team_id"]

    case operation do
      "update-api-key" ->
        update_api_key("api_key", integration, conn)

      "check-access" ->
        case Integration.Linear.check_access(api_key) do
          {:ok, r} ->
            nodes = r["teams"]["nodes"] |> Enum.filter(&(&1["id"] === team_id))
            r = %{r | "teams" => %{"nodes" => nodes}}
            ok_json(conn, r |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "create-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        label_id = integration.specifics["fogbender_label_id"]
        issue_title = data["issueTitle"]

        case Integration.Linear.create_issue(api_key, team_id, issue_title, label_id) do
          {:ok, r} ->
            ok_json(conn, r |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        issue_title = data["issueTitle"]
        issue_id = data["issueId"]

        case Integration.Linear.delete_issue(api_key, issue_id) do
          :ok ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, _} ->
            forbid(conn)
        end

      "get-issue-by-name" ->
        get_issue_by_name(workspace.id, "linear", conn)

      "delete-webhook" ->
        webhook_id = integration.specifics["webhook_id"]

        case Integration.Linear.delete_webhook(api_key, webhook_id) do
          :ok ->
            ok_no_content(conn)

          {:error, _} ->
            forbid(conn)
        end

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("github", operation, integration, workspace, conn) do
    api_key = integration.specifics["api_key"]
    repo = integration.specifics["repo"]

    case operation do
      "update-api-key" ->
        update_api_key("api_key", integration, conn)

      "get-repositories" ->
        case Integration.GitHub.get_repositories(api_key) do
          {:ok, data} ->
            case data |> Enum.find(fn r -> r["full_name"] === repo end) do
              repository when not is_nil(repository) ->
                ok_no_content(conn)

              _ ->
                forbid(conn)
            end

          {:error, _} ->
            forbid(conn)
        end

      "create-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        issue_title = data["issueTitle"]

        case Integration.GitHub.create_issue(api_key, repo, issue_title) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        issue_title = data["issueTitle"]
        issue_number = data["issueNumber"]

        case Integration.GitHub.close_issue(api_key, repo, issue_number) do
          {:ok, _} ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, :not_found} ->
            send_resp(conn, 404, "Not found")

          {:error, :not_authorized} ->
            forbid(conn)
        end

      "get-issue-by-name" ->
        get_issue_by_name(workspace.id, "github", conn)

      "delete-webhook" ->
        webhook_id = integration.specifics["webhook_id"]

        case Integration.GitHub.delete_webhook(api_key, repo, webhook_id) do
          :ok ->
            ok_no_content(conn)

          {:error, _} ->
            forbid(conn)
        end

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("asana", operation, integration, workspace, conn) do
    api_key = integration.specifics["api_key"]
    project_id = integration.specifics["project_id"]

    case operation do
      "update-api-key" ->
        update_api_key("api_key", integration, conn)

      "get-projects" ->
        case Integration.Asana.get_projects(api_key) do
          {:ok, data} ->
            project_name = integration.specifics["project_name"]

            project = data |> Enum.find(fn p -> p["name"] === project_name end)

            if project do
              ok_no_content(conn)
            else
              forbid(conn)
            end

          {:error, _} ->
            forbid(conn)
        end

      "create-task" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        tag_id = integration.specifics["fogbender_tag_id"]
        task_title = data["taskTitle"]

        case Integration.Asana.create_task(api_key, project_id, task_title, tag_id) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-task" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)

        task_title = data["taskTitle"]
        task_id = data["taskId"]

        case Integration.Asana.delete_task(api_key, task_id) do
          :ok ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: task_title, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, :not_found} ->
            send_resp(conn, 404, "Not found")

          {:error, :not_authorized} ->
            forbid(conn)
        end

      "get-task-by-id" ->
        # TODO Asana's webhooks are very slow, need a better way to sync with incoming event
        get_task_by_id(workspace.id, "asana", conn, 5)

      "delete-webhook" ->
        webhook_id = integration.specifics["webhook_id"]

        case Integration.Asana.delete_webhook(api_key, webhook_id) do
          :ok ->
            ok_no_content(conn)

          {:error, _} ->
            forbid(conn)
        end

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("jira", operation, integration, workspace, conn) do
    case operation do
      "update-api-key" ->
        update_api_key("access_token", integration, conn)

      "check-access" ->
        jira_url = integration.specifics["jira_url"]
        jira_user = integration.specifics["jira_user"]
        token = integration.specifics["token"]
        project_id = integration.project_id

        case Integration.Jira.check_access(jira_url, jira_user, token, project_id) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "create-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        issue_title = data["issueTitle"]
        jira_url = integration.specifics["jira_url"]
        jira_user = integration.specifics["jira_user"]
        token = integration.specifics["token"]
        project_id = integration.project_id

        case Integration.Jira.create_issue(jira_url, jira_user, token, project_id, issue_title) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        issue_id = data["issueId"]
        issue_title = data["issueTitle"]
        jira_url = integration.specifics["jira_url"]
        jira_user = integration.specifics["jira_user"]
        token = integration.specifics["token"]

        case Integration.Jira.delete_issue(jira_url, jira_user, token, issue_id) do
          :ok ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: issue_title, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, :not_found} ->
            send_resp(conn, 404, "Not found")

          {:error, :not_authorized} ->
            forbid(conn)
        end

      "get-issue-by-name" ->
        get_issue_by_name(workspace.id, integration.type, conn)

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("height", operation, integration, workspace, conn) do
    case operation do
      "update-api-key" ->
        {:ok, conn} = update_user_token(integration, conn)
        ok_no_content(conn)

      "check-access" ->
        user_token = integration.specifics["user_token"]

        case Integration.Height.check_access(user_token) do
          {:ok, data, maybe_user_token} ->
            Integration.store_user_token_if_needed(integration, maybe_user_token)
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "create-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        issue_title = data["issueTitle"]
        user_token = integration.specifics["user_token"]
        fogbender_list_id = integration.specifics["fogbender_list_id"]

        case Integration.Height.create_task(user_token, fogbender_list_id, issue_title) do
          {:ok, data, _} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        user_token = integration.specifics["user_token"]
        task_id = data["taskId"]
        task_name = data["taskName"]

        case Integration.Height.delete_task(user_token, task_id) do
          {:ok, _} ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: task_name, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, :not_found} ->
            send_resp(conn, 404, "Not found")

          {:error, :not_authorized} ->
            forbid(conn)
        end

      "get-issue-by-name" ->
        get_issue_by_name(workspace.id, integration.type, conn)

      "delete-webhook" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        webhook_url = data["webhookUrl"]
        user_token = integration.specifics["user_token"]

        {:ok, webhooks} = Integration.Height.get_webhooks(user_token)

        webhooks
        |> Enum.filter(fn %{"url" => url} -> url == webhook_url end)
        |> Enum.each(fn %{"id" => id} ->
          {:ok, _} = Integration.Height.delete_webhook(user_token, id)
        end)

        ok_no_content(conn)

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("trello", operation, integration, workspace, conn) do
    case operation do
      "update-api-key" ->
        update_api_key("token", integration, conn)

      "check-access" ->
        token = integration.specifics["token"]

        case Integration.Trello.check_access(token) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "create-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        issue_title = data["issueTitle"]
        token = integration.specifics["token"]
        id_board = integration.project_id

        case Integration.Trello.create_card(token, id_board, issue_title) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        token = integration.specifics["token"]
        card_id = data["cardId"]
        card_name = data["cardName"]

        case Integration.Trello.delete_card(token, card_id) do
          {:ok, _} ->
            internal_hid = Fog.Utils.internal_hid(workspace.id)

            case Data.Room |> Repo.get_by(name: card_name, helpdesk_id: internal_hid) do
              nil ->
                :ok

              room ->
                room |> Repo.delete()
            end

            ok_no_content(conn)

          {:error, :not_found} ->
            send_resp(conn, 404, "Not found")

          {:error, :not_authorized} ->
            forbid(conn)
        end

      "get-issue-by-name" ->
        get_issue_by_name(workspace.id, integration.type, conn, integration)

      "delete-webhook" ->
        token = integration.specifics["token"]
        webhook_id = integration.specifics["webhook_id"]

        {:ok, _} = Integration.Trello.delete_webhook(token, webhook_id)

        ok_no_content(conn)

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  # slack is slack-agent
  defp integration_operation("slack", operation, integration, workspace, conn) do
    case operation do
      "update-api-key" ->
        {:ok, conn} = update_user_token(integration, conn)

        # reload to get new access_token
        integration = Repo.Integration.get(workspace.id, integration.id)

        access_token = integration.specifics["access_token"]

        linked_channel_id = integration.specifics["linked_channel_id"]

        {:ok, _} = Slack.Api.join_channel(access_token, linked_channel_id)

        shared_channel_helpdesk_associations =
          integration.specifics["shared_channel_helpdesk_associations"] || []

        shared_channel_helpdesk_associations
        |> Enum.each(fn %{"shared_channel_id" => shared_channel_id} ->
          {:ok, _} = Slack.Api.join_channel(access_token, shared_channel_id)
        end)

        ok_no_content(conn)

      "check-access" ->
        access_token = integration.specifics["access_token"]

        case Slack.Api.check_access(access_token) do
          {:ok, data, nil} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "list-shared-channels" ->
        access_token = integration.specifics["access_token"]
        linked_team_id = integration.specifics["team_id"]

        case Slack.Api.shared_channels_list(access_token, linked_team_id) do
          {:ok, data} ->
            data =
              data
              |> Enum.map(fn %{"id" => channel_id} = channel_info ->
                {:ok, %{"channel" => %{"connected_team_ids" => team_ids}}} =
                  Slack.Api.channel_info(access_token, channel_id)

                other_team_ids =
                  team_ids |> Enum.filter(fn team_id -> team_id !== linked_team_id end)

                connected_team_names =
                  other_team_ids
                  |> Enum.map(fn team_id ->
                    {:ok, %{"team" => %{"name" => team_name}}} =
                      Slack.Api.team_info(access_token, team_id)

                    team_name
                  end)

                Map.merge(channel_info, %{"connected_team_names" => connected_team_names})
              end)

            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "associate-shared-channel-with-helpdesk" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, data} = Jason.decode(data)
        shared_channel_id = data["sharedChannelId"]
        helpdesk_id = data["helpdeskId"]

        if shared_channel_id do
          new_association = %{
            shared_channel_id: shared_channel_id,
            helpdesk_id: helpdesk_id
          }

          shared_channel_helpdesk_associations =
            (integration.specifics["shared_channel_helpdesk_associations"] || [])
            |> Enum.filter(fn
              %{"helpdesk_id" => hid, "shared_channel_id" => scid}
              when is_nil(hid) or is_nil(scid) ->
                false

              %{"shared_channel_id" => ^shared_channel_id} ->
                false

              %{"helpdesk_id" => ^helpdesk_id} ->
                false

              _ ->
                true
            end)

          %{
            "access_token" => access_token
          } = integration.specifics

          new_shared_channel_helpdesk_associations =
            if helpdesk_id do
              {:ok, _} = Slack.Api.join_channel(access_token, shared_channel_id)
              [new_association | shared_channel_helpdesk_associations]
            else
              {:ok, _} = Slack.Api.leave_channel(access_token, shared_channel_id)
              shared_channel_helpdesk_associations
            end

          specifics =
            integration.specifics
            |> Map.merge(%{
              "shared_channel_helpdesk_associations" => new_shared_channel_helpdesk_associations
            })

          %Data.WorkspaceIntegration{} =
            Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

          ok_no_content(conn)
        else
          send_resp(
            conn,
            404,
            "Bad params - sharedChannelId: #{shared_channel_id}, helpdeskId: #{helpdesk_id}"
          )
        end

      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("msteams", operation, integration, workspace, conn) do
    case operation do
      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("slack-customer", operation, integration, workspace, conn) do
    case operation do
      "delete" ->
        :ok = delete_integration(integration, workspace)
        ok_no_content(conn)

      "update" ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        {:ok, params} = Jason.decode(data)
        aggressive_ticketing = params["aggressiveTicketing"]

        specifics =
          integration.specifics |> Map.merge(%{"aggressive_ticketing" => aggressive_ticketing})

        %Data.WorkspaceIntegration{} =
          Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

        ok_no_content(conn)
    end
  end

  defp integration_operation("pagerduty", operation, integration, workspace, conn) do
    case operation do
      "delete" ->
        :ok = delete_integration(integration, workspace)
        Process.sleep(1000)
        ok_no_content(conn)

      "update-api-key" ->
        {:ok, conn} = update_user_token(integration, conn)
        Process.sleep(1000)
        ok_no_content(conn)

      "sync-group" ->
        group_name = conn.params["groupName"]
        schedule_id = conn.params["scheduleId"]
        schedule_name = conn.params["scheduleName"]

        specifics =
          Map.merge(integration.specifics, %{
            "agent_group" => group_name,
            "schedule_id" => schedule_id,
            "schedule_name" => schedule_name
          })

        %Data.WorkspaceIntegration{} =
          Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

        Process.sleep(1000)

        ok_no_content(conn)

      "unsync-group" ->
        specifics =
          Map.delete(integration.specifics, "agent_group")
          |> Map.delete("schedule_id")
          |> Map.delete("schedule_name")

        %Data.WorkspaceIntegration{} =
          Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

        Process.sleep(1000)

        ok_no_content(conn)

      "list-schedules" ->
        %{"user_token" => user_token} = integration.specifics

        {:ok, schedules} = Integration.PagerDuty.schedules(user_token)

        ok_json(conn, schedules |> Jason.encode!())
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

  defp error_json_not_found(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(404, data)
  end

  defp bad_request_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(400, data)
  end

  defp error_json_forbid(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(403, data)
  end

  defp forbid_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(403, data)
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

  def get_issue_by_name(workspace_id, type, conn, integration \\ nil) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    issue_title = data["issueTitle"]

    case type do
      "gitlab" ->
        issue =
          from(
            e in Data.IntegrationLog,
            where: e.workspace_id == ^workspace_id,
            where: json_extract_path(e.data, ["object_attributes", "title"]) == ^issue_title,
            where: e.workspace_id == ^workspace_id
          )
          |> Repo.one()

        case issue do
          %Data.IntegrationLog{} ->
            ok_no_content(conn)

          _ ->
            send_resp(conn, 404, "Not found")
        end

      "linear" ->
        issue =
          from(
            e in Data.IntegrationLog,
            where: json_extract_path(e.data, ["data", "title"]) == ^issue_title,
            where: e.data["action"] == ^"create",
            where: e.workspace_id == ^workspace_id
          )
          |> Repo.one()

        case issue do
          %Data.IntegrationLog{} ->
            ok_no_content(conn)

          _ ->
            send_resp(conn, 404, "Not found")
        end

      "github" ->
        issue =
          from(
            e in Data.IntegrationLog,
            where: json_extract_path(e.data, ["issue", "title"]) == ^issue_title,
            where: e.data["action"] == ^"opened",
            where: e.workspace_id == ^workspace_id
          )
          |> Repo.one()

        case issue do
          %Data.IntegrationLog{} ->
            ok_no_content(conn)

          _ ->
            send_resp(conn, 404, "Not found")
        end

      "jira" ->
        issue =
          from(
            e in Data.IntegrationLog,
            where: json_extract_path(e.data, ["issue", "fields", "summary"]) == ^issue_title,
            where: json_extract_path(e.data, ["webhookEvent"]) == ^"jira:issue_created",
            where: e.workspace_id == ^workspace_id
          )
          |> Repo.one()

        case issue do
          %Data.IntegrationLog{} ->
            ok_no_content(conn)

          _ ->
            send_resp(conn, 404, "Not found")
        end

      "height" ->
        issue =
          from(
            e in Data.IntegrationLog,
            where: json_extract_path(e.data, ["data", "model", "name"]) == ^issue_title,
            where: json_extract_path(e.data, ["type"]) == ^"task.created",
            where: e.workspace_id == ^workspace_id,
            limit: 1
          )
          |> Repo.one()

        case issue do
          %Data.IntegrationLog{} ->
            ok_no_content(conn)

          _ ->
            send_resp(conn, 404, "Not found")
        end

      "trello" ->
        issue =
          from(
            e in Data.IntegrationLog,
            where: json_extract_path(e.data, ["action", "data", "card", "name"]) == ^issue_title,
            where: json_extract_path(e.data, ["action", "type"]) == ^"createCard",
            where: e.workspace_id == ^workspace_id,
            limit: 1
          )
          |> Repo.one()

        case issue do
          %Data.IntegrationLog{} ->
            case integration do
              nil ->
                ok_no_content(conn)

              integration ->
                webhook_id = integration.specifics["webhook_id"]
                ok_json(conn, Jason.encode!(%{webhook_id: webhook_id}))
            end

          _ ->
            send_resp(conn, 404, "Not found")
        end

      _ ->
        send_resp(conn, 404, "Not found")
    end
  end

  def get_task_by_id(workspace_id, type, conn, retries \\ 1) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    get_task_by_id(data, workspace_id, type, conn, retries)
  end

  defp get_task_by_id(data, workspace_id, type, conn, retries) do
    res =
      case type do
        "asana" ->
          task_id = data["taskId"]

          from(
            e in Data.IntegrationLog,
            where: json_extract_path(e.data, ["resource", "gid"]) == ^task_id,
            where: json_extract_path(e.data, ["action"]) == ^"deleted",
            where: e.workspace_id == ^workspace_id
          )
          |> Repo.one()

        _ ->
          {:error, :invalid_type}
      end

    case res do
      %Data.IntegrationLog{} ->
        ok_no_content(conn)

      {:error, :invalid_type} ->
        send_resp(conn, 404, "Not found")

      _ when retries > 1 ->
        Process.sleep(3000)
        get_task_by_id(data, workspace_id, type, conn, retries - 1)

      _ ->
        send_resp(conn, 404, "Not found")
    end
  end

  defp delete_integration(integration, workspace) do
    Repo.get_by(Data.WorkspaceIntegration, id: integration.id)
    |> Repo.delete!()

    integration_tag =
      Data.Tag
      |> Repo.get_by(
        name: ":#{integration.type}:#{integration.project_id}",
        workspace_id: integration.workspace_id
      )

    inactive_tag = Repo.Tag.create(workspace.id, ":app:inactive")
    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, integration_tag.name)

    Fog.Utils.add_tags_to_author(bot_agent, [inactive_tag.id])

    :ok
  end

  defp update_api_key(api_key_field_name, integration, conn) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    api_key = data["apiKey"]

    specifics = %{integration.specifics | api_key_field_name => api_key}

    %Data.WorkspaceIntegration{} =
      Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

    ok_no_content(conn)
  end

  defp update_user_token(integration, conn) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)

    # NOTE: some integrations (Height) use refresh tokens, others (Slack, for now) don't
    # We need to store both user_token and access_token

    user_token = data["userToken"]
    user_info = data["userInfo"]

    {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)
    {:ok, user_token} = Fog.Integration.OAuth.decrypt(user_token)

    specifics =
      integration.specifics
      |> Map.put("user_token", user_token)
      |> Map.put("user_info", user_info)
      |> Map.put("access_token", access_token)

    %Data.WorkspaceIntegration{} =
      Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()

    {:ok, conn}
  end

  defp add_domain_to_customer(
         conn,
         %Data.Customer{id: id, vendor_id: vendor_id, domains: domains} = customer
       ) do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)

    case data["domain"] do
      nil ->
        send_resp(conn, 400, %{error: %{missing: "domain"}} |> Jason.encode!())

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
            send_resp(conn, 400, %{error: "domain_taken"} |> Jason.encode!())
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
        send_resp(conn, 400, %{error: %{missing: "domain"}} |> Jason.encode!())

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

  defp dates_to_unix(records) do
    records
    |> Enum.map(fn r ->
      %{
        r
        | insertedAt: to_unix(r.insertedAt),
          updatedAt: to_unix(r.updatedAt)
      }
    end)
  end

  defp with_crms(records) do
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

  defp from_crm(%Data.CustomerCrm{} = crm) do
    %{
      crmRemoteAccountId: crm.crm_remote_account_id,
      crmAccountId: crm.crm_account_id,
      crmId: crm.crm_id,
      crmRemoteId: crm.crm_remote_id,
      crmType: crm.crm_type,
      customerId: crm.customer_id
    }
  end

  defp from_crm(crm) do
    %{
      crmRemoteAccountId: crm["crm_remote_account_id"],
      crmAccountId: crm["crm_account_id"],
      crmId: crm["crm_id"],
      crmRemoteId: crm["crm_remote_id"],
      crmType: crm["crm_type"],
      customerId: Fog.Types.CustomerId.load(crm["customer_id"]) |> elem(1)
    }
  end

  defp to_customer_ids_in_domain_matches(records) do
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

  defp to_unix(nil), do: nil
  defp to_unix(us), do: Utils.to_unix(us)

  def helpdesks_query(workspace_id) do
    from(
      h in Data.Helpdesk,
      join: v in assoc(h, :vendor),
      join: c in Data.Customer,
      on: c.id == h.customer_id,
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

  defp merge_integration(workspace_id, {:end_user_origin_id, end_user_origin_id}) do
    from(
      e in Data.WorkspaceIntegration,
      where: e.workspace_id == ^workspace_id,
      where: json_extract_path(e.specifics, ["driver"]) == "merge",
      where: json_extract_path(e.specifics, ["end_user_origin_id"]) == ^end_user_origin_id
    )
    |> Repo.one()
  end

  defp merge_integration(workspace_id, {:crm_id, crm_id}) do
    from(
      e in Data.WorkspaceIntegration,
      where: e.workspace_id == ^workspace_id,
      where: json_extract_path(e.specifics, ["driver"]) == "merge",
      where: json_extract_path(e.specifics, ["crm_id"]) == ^crm_id
    )
    |> Repo.one()
  end

  defp merge_integration(workspace_id, {:crm_remote_id, crm_remote_id}) do
    from(
      e in Data.WorkspaceIntegration,
      where: e.workspace_id == ^workspace_id,
      where: json_extract_path(e.specifics, ["driver"]) == "merge",
      where: json_extract_path(e.specifics, ["remote_id"]) == ^crm_remote_id
    )
    |> Repo.one()
  end

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

  defp embedding_sources_to_tree([], _, acc), do: acc

  defp embedding_sources_to_tree([h | t], res, acc) do
    case res |> Enum.filter(&(&1.parent_id === h.id)) do
      [] ->
        fetching =
          if h.status === "fetching" do
            1
          else
            h.fetching
          end

        h =
          Map.merge(h, %{
            fetching: fetching
          })

        embedding_sources_to_tree(t, res, [h | acc])

      children ->
        children = embedding_sources_to_tree(children, res, []) |> Enum.sort(&(&1.url > &2.url))
        ready = h.ready + (children |> Enum.map(& &1.ready) |> Enum.sum())
        fetching = h.fetching + (children |> Enum.map(& &1.fetching) |> Enum.sum())

        embedding_sources_to_tree(t, res, [
          Map.merge(h, %{
            children: children,
            ready: ready,
            fetching: fetching
          })
          | acc
        ])
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

    if subscription && count_used_seats - free_seats > 0 do
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
