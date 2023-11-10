defmodule Test.Web.AgentScheduleTest do
  use Fog.RepoCase, async: false
  # alias Fog.Repo

  setup do
    vendor = vendor()
    agent = agent(vendor)
    Kernel.binding()
  end
end
