defmodule Fog.Integration.PagerDutyOncallSyncJob do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Data, Repo}

  def run() do
    Logger.info("Kicking off PagerDutyOncallSyncJob")

    from(
      wi in Data.WorkspaceIntegration,
      where: wi.type == "pagerduty"
    )
    |> Repo.all()
    |> Enum.each(fn wi ->
      :ok = Fog.Integration.PagerDutyOncallSyncEventTask.schedule(integration: wi)
    end)
  end
end
