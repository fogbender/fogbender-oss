defmodule Fog.Web.MultiplayerDemoDialogRouter do
  require Logger
  require Ecto.Query.API

  import Ecto.Query, only: [from: 2]
  import Fog.Web.Helpers

  use Plug.Router
  # handler in cowboy.ex isn't catching stuff happening here for some reason
  use Plug.ErrorHandler

  alias Fog.{Data, Repo}

  plug(:match)
  plug(:fetch_query_params)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Fog.Plug.AgentSession)
  plug(:dispatch)

  post "/:command" do
    agent_id = conn.assigns[:agent_id]
    workspace_id = conn.params["workspaceId"]

    IO.inspect({"#0000000000000000000000000000", agent_id})

    unless command in ["play", "stop", "clear"] do
      send_bad_request_json(conn, %{error: "#{command} is an unknown command"})
    else
      with {:ok, workspace_id} <- validate_workspace_id(workspace_id),
           workspace <-
             Repo.get(Fog.Data.Workspace, workspace_id) |> Repo.preload([:vendor, :integrations]),
           :ok <- check_role(conn, workspace.vendor_id),
           {:ok, helpdesk} <- validate_helpdesk(find_helpdesk(workspace.vendor_id)),
           {:ok, users} <- find_users(helpdesk.id),
           {:ok, triage} <- validate_triage(find_triage(helpdesk.id)) do
        case Registry.lookup(Registry.MultiplayerDemoDialog, helpdesk.id) do
          [{pid, _}] ->
            case command do
              "play" ->
                :ok = Fog.Web.MultiplayerDemoDialog.play(pid)
                ok_no_content(conn)

              "stop" ->
                :ok = Fog.Web.MultiplayerDemoDialog.stop(pid)
                ok_no_content(conn)

              "clear" ->
                :ok = Fog.Web.MultiplayerDemoDialog.clear(pid)
                ok_no_content(conn)
            end

          [] ->
            case command do
              "play" ->
                case Fog.Web.MultiplayerDemoDialog.start_link(
                       workspace: workspace,
                       helpdesk_id: helpdesk.id,
                       users: users,
                       triage: triage
                     ) do
                  {:ok, _pid} ->
                    ok_no_content(conn)

                  {:error, _reason} ->
                    send_bad_request_json(conn, %{error: "Failed to start dialog"})
                end

              _ ->
                send_bad_request_json(conn, %{error: "No recording replay in progress"})
            end
        end
      else
        {:error, :missing_workspace_id} ->
          send_bad_request_json(conn, %{error: %{missing_parameter: "workspaceId"}})

        {:error, :invalid_role} ->
          send_bad_request_json(conn, %{error: "Must be owner"})

        {:error, :user_not_found} ->
          send_bad_request_json(conn, %{error: "Alice or Bob not present"})

        {:error, :missing_triage} ->
          send_bad_request_json(conn, %{error: "Missing Triage"})

        nil ->
          send_bad_request_json(conn, %{error: "No fogbender-widget-demo customer"})
      end
    end
  end

  defp validate_workspace_id(nil), do: {:error, :missing_workspace_id}
  defp validate_workspace_id(workspace_id), do: {:ok, workspace_id}

  defp validate_triage(nil), do: {:error, :missing_triage}
  defp validate_triage(triage), do: {:ok, triage}

  defp validate_helpdesk(nil), do: {:error, :missing_helpdesk}
  defp validate_helpdesk(helpdesk), do: {:ok, helpdesk}

  defp check_role(conn, vendor_id) do
    if role_at_or_above(our_role(conn, vendor_id), "owner"),
      do: :ok,
      else: {:error, :invalid_role}
  end

  defp find_helpdesk(vendor_id) do
    from(
      h in Data.Helpdesk,
      join: c in assoc(h, :customer),
      on: c.vendor_id == ^vendor_id and c.external_uid == "fogbender-widget-demo"
    )
    |> Repo.one()
  end

  defp find_triage(helpdesk_id) do
    from(
      r in Data.Room,
      where: r.helpdesk_id == ^helpdesk_id,
      where: r.is_triage == true
    )
    |> Repo.one()
  end

  defp find_users(helpdesk_id) do
    case from(
           u in Data.User,
           join: h in assoc(u, :helpdesk),
           on: h.id == ^helpdesk_id,
           where: u.name == "Alice" or u.name == "Bob",
           preload: [:vendor]
         )
         |> Repo.all() do
      [] ->
        {:error, :no_users}

      users when length(users) === 2 ->
        with %Data.User{} = alice <- users |> Enum.find(&(&1.name === "Alice")),
             %Data.User{} = bob <- users |> Enum.find(&(&1.name === "Bob")) do
          alice_sess = Fog.Api.Session.for_user(alice.vendor.id, alice.helpdesk_id, alice.id)
          bob_sess = Fog.Api.Session.for_user(bob.vendor.id, bob.helpdesk_id, bob.id)
          {:ok, %{alice: alice, bob: bob, alice_sess: alice_sess, bob_sess: bob_sess}}
        else
          nil -> {:error, :user_not_found}
        end
    end
  end

  defp handle_errors(conn, %{kind: _kind, reason: _reason, stack: stack}) do
    Logger.error("#{inspect(stack)}")
    send_resp(conn, conn.status, Jason.encode!(%{"error" => "something went wrong"}))
  end
end
