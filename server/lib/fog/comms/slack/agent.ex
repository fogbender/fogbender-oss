defmodule Fog.Comms.Slack.Agent do
  @behaviour Fog.Integration.Behaviour

  alias Fog.{Data}

  def token(%Data.WorkspaceIntegration{} = i) do
    i.specifics["access_token"]
  end

  def url(%Data.WorkspaceIntegration{} = i) do
    i.specifics["team_url"]
  end

  def name(%Data.WorkspaceIntegration{} = i) do
    i.specifics["team_name"]
  end

  def integration_tag_name(%Data.WorkspaceIntegration{} = i) do
    ":slack:#{i.project_id}"
  end

  def commands(_), do: nil
end
