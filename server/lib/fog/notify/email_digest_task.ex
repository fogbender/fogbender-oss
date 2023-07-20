defmodule Fog.Notify.EmailDigestTask do
  alias Fog.Data
  require Logger

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule_many(entries) do
    for e <- entries do
      Task.Supervisor.start_child(__MODULE__, __MODULE__, :run_email, [e])
      Task.Supervisor.start_child(__MODULE__, __MODULE__, :run_slack, [e])
    end

    :ok
  end

  def run_email(%Data.EmailDigest{} = data) do
    Fog.Email.Digest.send(data)
  end

  def run_slack(%Data.EmailDigest{} = data) do
    Fog.Comms.Slack.Agent.Digest.send(data)
  end

  def run(_) do
    :ok
  end
end
