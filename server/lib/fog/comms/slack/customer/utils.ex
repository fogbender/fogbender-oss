defmodule Fog.Comms.Slack.Customer.Utils do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def get_slack_customer_workspace_integration(helpdesk_id) do
    from(
      i in Data.WorkspaceIntegration,
      join: w in assoc(i, :workspace),
      join: h in assoc(w, :helpdesks),
      on: h.id == ^helpdesk_id and i.type == "slack-customer"
    )
    |> Repo.one()
  end

  def get_slack_customer_helpdesk_integration(helpdesk_id) do
    from(
      i in Data.HelpdeskIntegration,
      join: h in assoc(i, :helpdesk),
      on: h.id == ^helpdesk_id and i.type == "slack-customer"
    )
    |> Repo.one()
  end
end
