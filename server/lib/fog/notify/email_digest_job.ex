defmodule Fog.Notify.EmailDigestJob do
  require Logger

  import Ecto.Query
  alias Fog.{Data, Repo, Notify}

  @limit 100

  def run(limit \\ @limit) do
    run_for_agents(limit)
    run_for_users(limit)
    :ok
  end

  def run_for_agents(limit \\ @limit) do
    Logger.info("EmailDigestJob: run_for_agents started")

    ts = DateTime.utc_now()

    Repo.EmailDigest.agents_to_notify(ts, limit)
    |> update_last_digest_check_agents(ts)
    |> Repo.EmailDigest.load_agent_badges()
    |> Notify.EmailDigestTask.schedule_many()

    Logger.info("EmailDigestJob: run_for_agents finished")
  end

  def run_for_users(limit \\ @limit) do
    Logger.info("EmailDigestJob: run_for_users started")

    ts = DateTime.utc_now()

    users_data(ts, limit)
    |> Repo.EmailDigest.load_user_badges()
    |> Notify.EmailDigestTask.schedule_many()

    Logger.info("EmailDigestJob: run_for_users finished")
  end

  def users_data(ts, limit) do
    Repo.EmailDigest.users_to_notify(ts, limit)
    |> update_last_digest_check_users(ts)
  end

  defp update_last_digest_check_users([], _ts), do: []

  defp update_last_digest_check_users(data, ts) do
    Logger.info(
      "EmailDigestJob: processing #{length(data)} user digests, from vendors: #{vendors(data)}"
    )

    Data.User
    |> filter_users(data)
    |> Repo.update_all(set: [last_digest_check_at: ts])

    data
  end

  defp update_last_digest_check_agents([], _ts), do: []

  defp update_last_digest_check_agents(data, ts) do
    Logger.info(
      "EmailDigestJob: processing #{length(data)} agent digests, from vendors: #{vendors(data)}"
    )

    from(Data.VendorAgentRole, as: :agent)
    |> filter_agents(data)
    |> Repo.update_all(set: [last_digest_check_at: ts])

    data
  end

  defp vendors(data) do
    data
    |> Enum.map(fn %Data.EmailDigest{vendor_id: vid} -> vid end)
    |> Enum.uniq()
  end

  defp filter_agents(query, data) do
    filter =
      for(%Data.EmailDigest{agent_id: aid, vendor_id: vid} <- data, do: {vid, aid})
      |> Enum.uniq()
      |> Enum.reduce(false, fn {vid, aid}, condition ->
        dynamic([agent: ar], (ar.vendor_id == ^vid and ar.agent_id == ^aid) or ^condition)
      end)

    from(query, where: ^filter)
  end

  defp filter_users(query, data) do
    filter =
      data
      |> Enum.map(& &1.user_id)
      |> Enum.uniq()

    where(query, [u], u.id in ^filter)
  end
end
