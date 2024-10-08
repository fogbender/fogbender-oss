defmodule Fog.Notify.EmailDigestJob do
  require Logger

  import Ecto.Query
  alias Fog.{Data, Repo, Notify}

  @limit 100

  def run(limit \\ @limit) do
    ts = DateTime.utc_now()
    run_for_agents(ts, limit)
    run_for_users(ts, limit)
    :ok
  end

  def run_for_agents(ts, limit \\ @limit) do
    Repo.EmailDigest.agents_to_notify(ts, limit)
    |> update_last_digest_check_agents(ts)
    |> Repo.EmailDigest.load_agent_badges()
    |> Notify.EmailDigestTask.schedule_many()
  end

  def run_for_users(ts, limit \\ @limit) do
    Repo.Helpdesk.all()
    |> Task.async_stream(
      fn h ->
        helpdesk_users_data(h.id, ts, limit)
        |> Repo.EmailDigest.load_user_badges()
        |> Notify.EmailDigestTask.schedule_many()
      end,
      max_concurrency: 1,
      timeout: :infinity,
      on_timeout: :kill_task
    )
    |> Enum.each(fn
      {:ok, _result} ->
        :ok

      {:error, reason} ->
        Logger.error("Process failed: #{inspect(reason)}")
    end)

    # users_data(ts, limit)
    # |> Repo.EmailDigest.load_user_badges()
    # |> Notify.EmailDigestTask.schedule_many()
  end

  def users_data(ts, limit) do
    Repo.EmailDigest.users_to_notify(ts, limit)
    |> update_last_digest_check_users(ts)
  end

  def helpdesk_users_data(hid, ts, limit) do
    Repo.EmailDigest.helpdesk_users_to_notify(hid, ts, limit)
    |> update_last_digest_check_users(ts)
  end

  defp update_last_digest_check_users([], _ts), do: []

  defp update_last_digest_check_users(data, ts) do
    Data.User
    |> filter_users(data)
    |> Repo.update_all(set: [last_digest_check_at: ts])

    data
  end

  defp update_last_digest_check_agents([], _ts), do: []

  defp update_last_digest_check_agents(data, ts) do
    from(Data.VendorAgentRole, as: :agent)
    |> filter_agents(data)
    |> Repo.update_all(set: [last_digest_check_at: ts])

    data
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
