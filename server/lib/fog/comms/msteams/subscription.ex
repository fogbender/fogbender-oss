defmodule Fog.Comms.MsTeams.Subscription do
  require Logger

  alias Fog.Comms.{MsTeams}

  def add_subscription(tenant_id, team_aad_group_id, channel_id, helpdesk_id) do
    add_subscription(tenant_id, team_aad_group_id, channel_id, helpdesk_id, 0)
  end

  def add_subscription(tenant_id, team_aad_group_id, channel_id, helpdesk_id, tries)
      when is_number(tries) and tries < 10 do
    resource = "teams/#{team_aad_group_id}/channels/#{channel_id}/messages"

    {:ok, aes_256_key} = ExCrypto.generate_aes_key(:aes_256, :bytes)
    {:ok, {init_vec, secret}} = ExCrypto.encrypt(aes_256_key, helpdesk_id)
    aes_256_key = aes_256_key |> Base.encode64(padding: false)
    secret = secret |> Base.encode64(padding: false)
    init_vec = init_vec |> Base.encode64(padding: false)

    try do
      {:ok, subscription_id} =
        case MsTeams.Api.add_subscription(tenant_id, resource, secret) do
          {:ok, _} ->
            get_subscription_id(tenant_id, resource)

          :already_added ->
            get_subscription_id(tenant_id, resource)

          :no_access ->
            params = {tenant_id, team_aad_group_id, channel_id, helpdesk_id}

            Logger.error(
              "MS Teams add subscription error - :no_access on retry ##{tries + 1} - #{inspect(params)}"
            )

            # this may happen for no reason - let's retry
            Process.sleep(2500)
            add_subscription(tenant_id, team_aad_group_id, channel_id, helpdesk_id, tries + 1)

          {:error, :timeout} ->
            get_subscription_id(tenant_id, resource)
        end

      aes_256_key = %{
        "key" => aes_256_key,
        "init_vec" => init_vec
      }

      {:ok, subscription_id, aes_256_key}
    rescue
      e ->
        params = {tenant_id, team_aad_group_id, channel_id, helpdesk_id}
        Logger.error("MS Teams add subscription error: #{inspect(params)} #{inspect(e)}")
        reraise e, __STACKTRACE__
    end
  end

  def add_subscription(_tenant_id, _team_aad_group_id, _channel_id, _helpdesk_id, _tries) do
    nil
  end

  def get_subscription_id(tenant_id, resource) do
    get_subscription_id(tenant_id, resource, 0)
  end

  defp get_subscription_id(tenant_id, resource, tries) when is_number(tries) and tries < 10 do
    {:ok, %{"value" => subscriptions}} = MsTeams.Api.get_subscriptions(tenant_id)

    res =
      subscriptions
      |> Enum.find_value(fn
        %{"resource" => ^resource, "id" => subscription_id} ->
          # apparently nonexistent subscritpions can be listed here, need to make sure it exists
          case MsTeams.Api.get_subscription(tenant_id, subscription_id) do
            {:ok, _} ->
              {:ok, subscription_id}

            _ ->
              false
          end

        _ ->
          false
      end)

    case res do
      nil ->
        params = {tenant_id, resource}

        Logger.error(
          "MS Teams add subscription - get_subscription returns nil on try ##{tries + 1} - #{inspect(params)}"
        )

        Process.sleep(2500)
        get_subscription_id(tenant_id, resource, tries + 1)

      _ ->
        res
    end
  end

  defp get_subscription_id(_, _, _), do: nil
end
