defmodule Fog.Web.APIRouter do
  require Logger
  require Ecto.Query.API

  import Ecto.Query, only: [from: 2]

  import Fog.Web.Helpers

  use Plug.Router

  alias Fog.{Ai, Api, Data, Integration, Repo, Merge, Slack}
  alias Fog.Comms.{MsTeams, Slack}

  @hostname_regex ~r/^(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/

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

  get "/workspaces/:workspace_id/llm" do
    workspace =
      Fog.Data.Workspace
      |> Fog.Repo.get(workspace_id)
      |> Repo.preload([:vendor, :llm_integrations])

    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      provider = conn.params["provider"]

      api_keys =
        get_req_header(conn, "openai-api-key")
        |> Enum.map(fn k -> {provider, k} end)
        |> Enum.reject(fn
          {_, ""} ->
            true

          _ ->
            false
        end)

      integrations =
        workspace.llm_integrations
        |> Enum.filter(&(is_nil(provider) || &1.provider === provider))

      assistant_ids = integrations |> Enum.map(& &1.assistant_id)
      providerKeys = integrations |> Enum.map(&{&1.provider, &1.api_key}) |> Enum.uniq()

      assistants =
        (api_keys ++ providerKeys)
        |> Enum.flat_map(fn {provider, api_key} ->
          %{"data" => assistants} =
            case provider do
              "OpenAI" ->
                Fog.Llm.OpenAi.Api.assistants(api_key)
            end

          assistants
          |> Enum.filter(fn a -> Map.has_key?(a["metadata"], "fogbender-version") end)
          |> Enum.map(fn a ->
            if a["id"] in assistant_ids do
              integration =
                integrations
                |> Enum.find(&(&1.provider === provider && &1.assistant_id === a["id"]))

              Map.merge(a, %{
                enabled: integration.enabled,
                provider: provider,
                api_key_last_4: api_key_last_4(api_key),
                mcp_appliance_url: integration.mcp_appliance_url
              })
            else
              Map.merge(a, %{provider: provider, api_key_last_4: api_key_last_4(api_key)})
            end
          end)
        end)
        |> Enum.uniq_by(& &1["id"])

      ok_json(
        conn,
        Jason.encode!(assistants)
      )
    else
      forbid(conn)
    end
  end

  get "/workspaces/:workspace_id/llm/OpenAI/assistants" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id) |> Repo.preload(:vendor)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case get_req_header(conn, "openai-api-key") do
        [api_key] ->
          if api_key do
            %{"data" => assistants} = Fog.Llm.OpenAi.Api.assistants(api_key)

            assistants =
              assistants
              |> Enum.filter(fn a -> Map.has_key?(a["metadata"], "fogbender-version") end)
              |> Enum.map(
                &Map.merge(&1, %{provider: "OpenAI", api_key_last_4: api_key_last_4(api_key)})
              )

            ok_json(
              conn,
              Jason.encode!(%{"data" => assistants})
            )
          else
            send_bad_request_json(conn, %{error: %{missing: "apiKey"}})
          end

        _ ->
          send_bad_request_json(conn, %{error: %{missing_header: "OPENAI_API_KEY"}})
      end
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/llm/OpenAI/assistants" do
    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id) |> Repo.preload(:vendor)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      case get_req_header(conn, "openai-api-key") do
        [api_key] ->
          version = "0.1"

          {:ok, assistant} = Fog.Llm.OpenAi.Api.create_assistant(api_key, version)

          %{"name" => assistant_name, "id" => assistant_id} =
            Map.merge(assistant, %{provider: "OpenAI", api_key_last_4: api_key_last_4(api_key)})

          # XXX we need to add this assistant to the integration
          # we also need to add the version column to llm integration table, and add version to constraint
          # we need to add a constraint ensuring only one assistant can be enabled
          #
          # it doesn't make sense to show available assistants and previously configured assistants in UI
          # all we care about is whether there is an assistant created, and if not - create one
          # we need to have a 'delete' button in the UI to remove unneeded Fogbender assistants
          # enabled column should allow unchecking the radio button - so the states are none selected or one selected

          :ok =
            add_assistant(
              workspace: workspace,
              assistant_name: assistant_name,
              provider: "OpenAI",
              api_key: api_key,
              assistant_id: assistant_id,
              version: version
            )

          ok_json(
            conn,
            Jason.encode!(%{"data" => assistant})
          )

        _ ->
          send_bad_request_json(conn, %{error: %{missing_header: "OPENAI_API_KEY"}})
      end
    else
      forbid(conn)
    end
  end

  patch "/workspaces/:workspace_id/llm/assistants/:assistant_id" do
    Process.sleep(1000)

    workspace = Fog.Data.Workspace |> Fog.Repo.get(workspace_id) |> Repo.preload(:vendor)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      provider = conn.params["provider"]

      if is_nil(provider) do
        send_bad_request_json(conn, %{error: "Missing provider"})
      else
        "enabled" = conn.params["toggle"]

        get_llmi = fn ->
          Data.WorkspaceLlmIntegration
          |> Repo.get_by(
            workspace_id: workspace_id,
            provider: provider,
            assistant_id: assistant_id
          )
        end

        assistant = get_llmi.()

        %{enabled: enabled} =
          case assistant do
            nil ->
              api_key =
                case get_req_header(conn, "openai-api-key") do
                  [h] when h in [nil, ""] ->
                    %{api_key: api_key} =
                      from(
                        llmi in Data.WorkspaceLlmIntegration,
                        where: llmi.provider == ^provider,
                        where: llmi.workspace_id == ^workspace_id,
                        limit: 1
                      )
                      |> Repo.one()

                    api_key

                  [api_key] when is_binary(api_key) ->
                    api_key
                end

              %{"name" => assistant_name} = Fog.Llm.OpenAi.Api.assistant(api_key, assistant_id)

              :ok =
                add_assistant(
                  workspace: workspace,
                  assistant_name: assistant_name,
                  provider: "OpenAI",
                  api_key: api_key,
                  assistant_id: assistant_id,
                  version: "0.1"
                )

              get_llmi.()

            _ ->
              assistant
          end

        Repo.update_all(
          from(w in Data.WorkspaceLlmIntegration,
            where: w.workspace_id == ^workspace_id and w.provider == ^provider
          ),
          set: [enabled: false]
        )

        if !enabled do
          Data.WorkspaceLlmIntegration
          |> Repo.get_by(
            workspace_id: workspace_id,
            provider: provider,
            assistant_id: assistant_id
          )
          |> Data.WorkspaceLlmIntegration.update(enabled: true)
          |> Repo.update!()
        end

        ok_no_content(conn)
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
          send_bad_request_json(conn, %{error: %{missing_value: "publicToken"}})

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
              send_bad_request_json(
                conn,
                %{error: %{missing_parameter: "customerId"}}
              )

            {_, nil, _} ->
              send_bad_request_json(
                conn,
                %{error: %{missing_parameter: "crmRemoteAccountId"}}
              )

            {_, _, nil} ->
              send_bad_request_json(
                conn,
                %{error: %{missing_parameter: "crmAccountId"}}
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
              send_bad_request_json(
                conn,
                %{error: %{missing_parameter: "customerId"}}
              )

            {_, nil, _} ->
              send_bad_request_json(
                conn,
                %{error: %{missing_parameter: "crmRemoteAccountId"}}
              )

            {_, _, nil} ->
              send_bad_request_json(
                conn,
                %{error: %{missing_parameter: "crmAccountId"}}
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

                  send_bad_request_json(
                    conn,
                    %{error: %{conflictRecord: conflict_record}}
                  )
              end
          end

        _ ->
          send_bad_request_json(conn, %{error: %{unknown_operation: operation}})
      end
    else
      forbid(conn)
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
              forward_email_address: Repo.Workspace.forward_email_address(workspace_id),
              visitor_key: workspace.visitor_key,
              visitors_enabled: workspace.visitors_enabled
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

  post "/workspaces/:workspace_id/visitor_config" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      enabled = conn.params["enabled"]

      case enabled do
        true ->
          # generate new key if old one is too short or not set
          visitor_key =
            if Fog.UserSignature.valid_192bit_secret?(workspace.visitor_key || "") do
              workspace.visitor_key
            else
              Fog.UserSignature.generate_192bit_secret()
            end

          Data.Workspace.update(workspace,
            visitors_enabled: true,
            visitor_key: visitor_key
          )
          |> Repo.update!()

        false ->
          Data.Workspace.update(workspace,
            visitors_enabled: false
          )
          |> Repo.update!()
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/workspaces/:workspace_id/visitor_key_reset" do
    workspace = Data.Workspace |> Repo.get(workspace_id)
    our_role = our_role(conn, workspace.vendor_id)

    if role_at_or_above(our_role, "admin") do
      visitor_key = Fog.UserSignature.generate_192bit_secret()

      Data.Workspace.update(workspace,
        visitor_key: visitor_key
      )
      |> Repo.update!()

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

  get "/users/:id" do
    throw(:crash)

    data =
      Data.User
      |> Repo.get(id)
      |> Jason.encode!(pretty: true)

    ok_json(conn, data)
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
        "check-installation" ->
          installation_id = conn.params["installationId"]

          github_install =
            from(
              gi in Data.GitHubInstall,
              where: gi.installation_id == ^installation_id
            )
            |> Repo.one()

          case github_install do
            nil ->
              send_bad_request_json(conn, %{error: "No such installation"})

            _ ->
              case Integration.GitHub.check_installation(installation_id) do
                {:ok, repository} ->
                  File.write("/tmp/gh.json", Jason.encode!(repository))
                  ok_json(conn, repository |> Jason.encode!())

                {:error, :must_select_single_repository} ->
                  send_bad_request_json(conn, %{error: "Must select single repository"})
              end
          end

        "add-integration" ->
          installation_id = conn.params["installationId"]

          {:ok, repository} = Integration.GitHub.check_installation(installation_id)

          %{
            "id" => repository_id,
            "full_name" => repo,
            "html_url" => repository_url
          } = repository

          {:ok, token} = Integration.GitHub.installation_to_token(installation_id)

          {:ok, %{"id" => fogbender_label_id}} = Fog.Integration.GitHub.create_label(token, repo)

          specifics = %{
            "installation_id" => installation_id,
            "repo" => repo,
            "repository_id" => repository_id,
            "repository_url" => repository_url,
            "fogbender_label_id" => fogbender_label_id
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
          user_token = conn.params["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Slack.Api.check_access(access_token) do
            {:ok, data, nil} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, _} ->
              forbid(conn)
          end

        "create-channel" ->
          user_token = conn.params["userToken"]
          {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

          case Slack.Api.create_channel(access_token, "fogbender") do
            {:ok, data} ->
              ok_json(conn, data |> Jason.encode!())

            {:error, e} ->
              Logger.error("Error: #{inspect(e)}")
              forbid(conn)
          end

        "invite-to-channel" ->
          user_token = conn.params["userToken"]
          channel_id = conn.params["channelId"]
          user_id = conn.params["userId"]

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
              project_id = conn.params["projectId"]
              project_name = conn.params["projectName"]
              project_url = conn.params["projectUrl"]
              user_token = conn.params["userToken"]
              channel_id = conn.params["channelId"]
              user_info = conn.params["userInfo"]

              %{"botUserId" => slack_bot_user_id} = user_info

              {:ok, %{"access_token" => access_token}} = Fog.Integration.OAuth.decrypt(user_token)

              {:ok, %{"channel" => %{"name" => channel_name}}} =
                Slack.Api.channel_info(access_token, channel_id)

              specifics = %{
                "access_token" => access_token,
                "user_info" => user_info,
                "team_url" => project_url,
                "team_name" => project_name,
                "team_id" => project_id,
                "linked_channel_id" => channel_id,
                "linked_channel_name" => channel_name
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
              send_bad_request_json(conn, %{error: "missing scheme"})

            %URI{host: nil} ->
              send_bad_request_json(conn, %{error: "missing host"})

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
              send_bad_request_json(conn, %{error: %{missing: "id"}})

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

    # verifier should be treated as a secret
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
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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
        :ok = Repo.Workspace.delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("github", operation, integration, workspace, conn) do
    installation_id = integration.specifics["installation_id"]
    {:ok, api_key} = Integration.GitHub.installation_to_token(installation_id)
    repo = integration.specifics["repo"]

    case operation do
      "create-issue" ->
        issue_title = conn.params["issueTitle"]

        case Integration.GitHub.create_issue(api_key, repo, issue_title) do
          {:ok, data} ->
            ok_json(conn, data |> Jason.encode!())

          {:error, _} ->
            forbid(conn)
        end

      "delete-issue" ->
        issue_title = conn.params["issueTitle"]
        issue_number = conn.params["issueNumber"]

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

      "delete" ->
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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

      "linked-channel-info" ->
        access_token = integration.specifics["access_token"]
        linked_channel_id = integration.specifics["linked_channel_id"]

        case Slack.Api.channel_info(access_token, linked_channel_id) do
          {:ok, data} ->
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
        access_token = integration.specifics["access_token"]
        linked_channel_id = integration.specifics["linked_channel_id"]

        {:ok, %{"channel" => %{"name" => name}}} =
          Slack.Api.channel_info(access_token, linked_channel_id)

        {:ok, _} = Slack.Api.rename_channel(access_token, linked_channel_id, "old-#{name}")
        :ok = Repo.Workspace.delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("msteams", operation, integration, workspace, conn) do
    case operation do
      "delete" ->
        :ok = Repo.Workspace.delete_integration(integration, workspace)
        ok_no_content(conn)
    end
  end

  defp integration_operation("slack-customer", operation, integration, workspace, conn) do
    case operation do
      "delete" ->
        :ok = Repo.Workspace.delete_integration(integration, workspace)
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
          "meta_tag" => Integration.GitHub.integration_tag_name(i),
          "installation_id" => Integration.GitHub.installation_id(i)
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
          "linked_channel_id" => i.specifics["linked_channel_id"],
          "linked_channel_name" => i.specifics["linked_channel_name"],
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

  defp api_key_last_4(api_key), do: api_key |> String.slice(-4, 4)

  def valid_host?(host) do
    Regex.match?(@hostname_regex, host)
  end

  def valid_url?(url) do
    case URI.parse(url) do
      %URI{scheme: scheme, host: host} when scheme in ["http", "https"] and host != nil ->
        valid_host?(host)

      _ ->
        false
    end
  end

  def add_assistant(
        workspace: workspace,
        assistant_name: assistant_name,
        provider: provider,
        api_key: api_key,
        assistant_id: assistant_id,
        version: version
      ) do
    Data.WorkspaceLlmIntegration.new(
      workspace_id: workspace.id,
      assistant_name: assistant_name,
      provider: provider,
      api_key: api_key,
      assistant_id: assistant_id,
      version: version
    )
    |> Repo.insert!(
      on_conflict: :nothing,
      conflict_target: [:workspace_id, :provider, :assistant_id, :version]
    )

    {:ok, _} = Repo.Integration.create_assistant(workspace, assistant_name, assistant_id)

    :ok
  end
end
