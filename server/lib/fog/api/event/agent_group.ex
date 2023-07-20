defmodule Fog.Api.Event.AgentGroup do
  import Ecto.Query

  alias Fog.{Api, Repo, Data, PubSub}
  alias Fog.Api.Event.AgentGroup

  use Fog.StructAccess

  defstruct [
    :msgType,
    :msgId,
    :vendorId,
    :name,
    :agents
  ]

  def with_vendor_groups(q, vendor_id) do
    from(
      ag in q,
      right_join: vg in Data.VendorGroup,
      on: ag.group == vg.group and ag.vendor_id == vg.vendor_id,
      where: vg.vendor_id == ^vendor_id
    )
  end

  def load_inserted(%Data.Vendor{id: vendor_id} = _ctx, _opts, _sess) do
    q =
      from(
        ag in Data.VendorAgentGroup,
        right_join: vg in Data.VendorGroup,
        on: ag.group == vg.group and ag.vendor_id == vg.vendor_id,
        where: vg.vendor_id == ^vendor_id,
        preload: :agent,
        select_merge: %{
          group: vg.group,
          agent_id: ag.agent_id,
          inserted_at: vg.inserted_at
        }
      )

    map =
      q
      |> Repo.all()
      |> Enum.group_by(
        & &1.group,
        &case &1.agent do
          nil ->
            nil

          _ ->
            Api.Event.Agent.from_data(&1.agent)
        end
      )

    map
    |> Map.keys()
    |> Enum.map(fn group ->
      %AgentGroup{
        name: group,
        vendorId: vendor_id,
        agents:
          case Map.get(map, group) do
            [nil] -> []
            v -> v
          end
      }
    end)
  end

  def publish(%Data.VendorAgentGroup{vendor_id: vendor_id, group: group} = vendor_agent_group) do
    agents =
      from(
        g in Data.VendorAgentGroup,
        where: g.vendor_id == ^vendor_id and g.group == ^group,
        preload: :agent
      )
      |> Repo.all()
      |> Enum.map(fn g -> Api.Event.Agent.from_data(g.agent) end)

    group = %AgentGroup{
      name: group,
      vendorId: vendor_id,
      agents: agents
    }

    for t <- topics(vendor_agent_group), do: PubSub.publish(t, group)
    :ok
  end

  defp topics(%Data.VendorAgentGroup{vendor_id: vendor_id}) do
    [
      "vendor/#{vendor_id}/groups"
    ]
  end
end
