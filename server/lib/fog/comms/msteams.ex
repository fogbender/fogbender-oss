defmodule Fog.Comms.MsTeams do
  @behaviour Fog.Integration.Behaviour

  alias Fog.{Data, Repo}

  def token(%Data.WorkspaceIntegration{} = _i) do
    raise "Not implemented"
  end

  def url(_) do
    "https://fogbender.com/blog/fogbender-msteams-integration"
  end

  def name(_) do
    "Documentation"
  end

  def integration_tag_name(%Data.HelpdeskIntegration{} = i) do
    i = i |> Repo.preload(helpdesk: :vendor)
    ":msteams:MSTC-#{i.helpdesk.vendor.id}"
  end

  def integration_tag_name(%Data.WorkspaceIntegration{} = i) do
    i = i |> Repo.preload(workspace: :vendor)
    ":msteams:MSTC-#{i.workspace.vendor.id}"
  end

  def commands(%Data.WorkspaceIntegration{}), do: ["init", "status", "disconnect"]
  def commands(%Data.HelpdeskIntegration{}), do: nil
end
