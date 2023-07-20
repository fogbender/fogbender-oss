defmodule Fog.Integration.PagerDutyOncallSyncEventTask do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Data, Integration, Repo}

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(params) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [params])

    :ok
  end

  def run(
        integration: %Data.WorkspaceIntegration{
          type: "pagerduty",
          specifics: %{"agent_group" => agent_group} = specifics,
          workspace_id: workspace_id
        }
      ) do
    workspace = Repo.Workspace.get(workspace_id)
    vendor = Repo.Vendor.get(workspace.vendor_id) |> Repo.preload(agents: :agent)

    %{"user_token" => user_token} = specifics

    schedule_id = specifics["schedule_id"]

    oncall_emails = Integration.PagerDuty.oncall_emails(user_token, schedule_id)

    elibible_agents =
      vendor.agents
      |> Enum.filter(fn
        %Data.VendorAgentRole{role: role, agent: %Data.Agent{email: email}}
        when role in ["owner", "admin", "agent"] ->
          email in oncall_emails

        _ ->
          false
      end)

    structs_to_add =
      elibible_agents
      |> Enum.map(fn %Data.VendorAgentRole{agent_id: agent_id} ->
        %{
          agent_id: agent_id,
          vendor_id: vendor.id,
          group: agent_group,
          inserted_at: DateTime.utc_now(),
          updated_at: DateTime.utc_now()
        }
      end)

    {:ok, _} =
      Ecto.Multi.new()
      |> Ecto.Multi.delete_all(
        :delete_all,
        from(
          ag in Data.VendorAgentGroup,
          where: ag.vendor_id == ^vendor.id and ag.group == ^agent_group
        )
      )
      |> Ecto.Multi.insert_all(
        :insert_all,
        Data.VendorAgentGroup,
        structs_to_add
      )
      |> Repo.transaction()

    :ok
  end

  def run(_), do: :ok
end
