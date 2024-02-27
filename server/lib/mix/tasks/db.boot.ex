defmodule Mix.Tasks.Db.Boot do
  use Mix.Task

  alias Fog.{Repo, Data}

  @shortdoc "Local database bootstrap utils"

  @moduledoc """
  Local database bootstrap utils

  ## Commands

      mix db.boot agent - adds current agent as Fogbender org owner
      mix db.boot detective - adds current agent as detective account
  """

  def run(args) do
    Logger.configure(level: :info)
    Application.ensure_all_started(:fog)
    run_command(args)
  end

  defp run_command(["detective"]) do
    a = Data.Agent |> Repo.one()

    Data.Detective.new(agent_id: a.id, email: a.email, name: a.name)
    |> Repo.insert!()
  end

  defp run_command(["agent"]) do
    a =
      Data.Agent
      |> Repo.all()
      |> Enum.sort(&(&1.inserted_at < &2.inserted_at))
      |> List.first()

    v = Data.Vendor |> Repo.get(Fog.env(:fogbender_vendor_id))

    Repo.transaction(fn _ ->
      Data.VendorAgentRole.new(
        vendor_id: v.id,
        agent_id: a.id,
        role: "owner"
      )
      |> Repo.insert!()

      Data.VendorAgentGroup.new(
        vendor_id: v.id,
        agent_id: a.id,
        group: "all"
      )
      |> Repo.insert!()
    end)
  end

  defp run_command(_) do
    Mix.Task.run("help", ["db.boot"])
  end
end
