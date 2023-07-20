defmodule Fog.Comms.MsTeams.RenewSubscriptionsJob do
  require Logger

  import Ecto.Query

  alias Fog.{Data, Repo}
  alias Fog.Comms.{MsTeams}

  def run() do
    Logger.info("Expiring old connect codes")

    {_, _} =
      from(
        c in Data.ConnectCode,
        where: c.inserted_at > ago(24, "hour")
      )
      |> Repo.delete_all()

    Logger.info("Running renew subscription job")

    from(
      i in Data.HelpdeskIntegration,
      where: i.type == "msteams"
    )
    |> Repo.all()
    |> Enum.each(fn i ->
      try do
        %{
          "tenant_id" => tenant_id,
          "subscription_id" => subscription_id,
          "team_aad_group_id" => team_aad_group_id,
          "linked_channel_id" => channel_id
        } = i.specifics

        helpdesk = Repo.Helpdesk.get(i.helpdesk_id) |> Repo.preload(:workspace)

        case MsTeams.Api.renew_subscription(tenant_id, subscription_id) do
          {:ok, _} ->
            :ok

          {:error, :timeout} ->
            :ok

          :not_found ->
            {:ok, subscription_id, aes_256_key} =
              MsTeams.Subscription.add_subscription(
                tenant_id,
                team_aad_group_id,
                channel_id,
                i.helpdesk_id
              )

            unless is_nil(subscription_id) do
              specifics = %{
                i.specifics
                | "subscription_id" => subscription_id,
                  "aes_256_key" => aes_256_key
              }

              %Data.HelpdeskIntegration{} =
                Repo.HelpdeskIntegration.add(helpdesk, "msteams", specifics)
            end

            :ok

          e ->
            Logger.error("Renew subscription error: #{inspect(e)}")
        end
      rescue
        err ->
          Logger.error(
            "Renew subscription error:" <> Exception.format(:error, err, __STACKTRACE__)
          )
      end
    end)
  end
end
