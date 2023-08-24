defmodule Fog.Comms.MsTeams.Api do
  require Logger

  @service_url "https://smba.trafficmanager.net/amer/"

  def url(%Fog.Data.WorkspaceIntegration{}) do
    "n/a"
  end

  def name(%Fog.Data.WorkspaceIntegration{}) do
    "n/a"
  end

  def clear_access_token(tenant_id) do
    true = :ets.delete(:msteams_token_cache, {:graph_access_token, tenant_id})

    :ok
  end

  def get_graph_access_token(tenant_id, renew \\ false) do
    renew_token = fn ->
      path = "/#{tenant_id}/oauth2/v2.0/token"
      client_id = Fog.env(:msteams_client_id)
      client_secret = Fog.env(:msteams_client_secret)

      r =
        client_jwt()
        |> Tesla.post(path, %{
          grant_type: "client_credentials",
          client_id: client_id,
          client_secret: client_secret,
          scope: "https://graph.microsoft.com/.default"
        })

      case r do
        {:ok, %Tesla.Env{status: 200, body: %{"access_token" => access_token}}} ->
          true =
            :ets.insert(:msteams_token_cache, {{:graph_access_token, tenant_id}, access_token})

          {:ok, access_token}
      end
    end

    case {renew, :ets.lookup(:msteams_token_cache, {:graph_access_token, tenant_id})} do
      {_, []} ->
        renew_token.()

      {:renew, _} ->
        renew_token.()

      {false, [{{:graph_access_token, ^tenant_id}, token}]} ->
        {:ok, token}
    end
  end

  def get_access_token(renew \\ false) do
    renew_token = fn ->
      path = "/botframework.com/oauth2/v2.0/token"
      client_id = Fog.env(:msteams_client_id)
      client_secret = Fog.env(:msteams_client_secret)

      r =
        client_jwt()
        |> Tesla.post(path, %{
          grant_type: "client_credentials",
          client_id: client_id,
          client_secret: client_secret,
          scope: "https://api.botframework.com/.default"
        })

      case r do
        {:ok, %Tesla.Env{status: 200, body: %{"access_token" => access_token}}} ->
          true = :ets.insert(:msteams_token_cache, {:msbf_access_token, access_token})
          {:ok, access_token}
      end
    end

    case {renew, :ets.lookup(:msteams_token_cache, :msbf_access_token)} do
      {_, []} ->
        renew_token.()

      {:renew, _} ->
        renew_token.()

      {false, [msbf_access_token: token]} ->
        {:ok, token}
    end
  end

  def post_message(conversation_id, text, format \\ "plain") do
    path = "/v3/conversations/#{conversation_id}/activities"

    {:ok, access_token} = get_access_token()

    r =
      client_with_retry(access_token, @service_url)
      |> Tesla.post(path, %{
        type: "message",
        text: text,
        textFormat: format

        # locale: "en-US"
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{"message" => "Authorization has been denied for this request."}
       }} ->
        {:ok, _} = get_access_token(:renew)
        post_message(conversation_id, text, format)
    end
  end

  def post_message_with_attachments(conversation_id, attachments) do
    path = "/v3/conversations/#{conversation_id}/activities"

    {:ok, access_token} = get_access_token()

    r =
      client_with_retry(access_token, @service_url)
      |> Tesla.post(path, %{
        type: "message",
        attachments: attachments

        # locale: "en-US"
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{"message" => "Authorization has been denied for this request."}
       }} ->
        {:ok, _} = get_access_token(:renew)
        post_message_with_attachments(conversation_id, attachments)
    end
  end

  def delete_message(conversation_id, activity_id) do
    path = "/v3/conversations/#{conversation_id}/activities/#{activity_id}"

    {:ok, access_token} = get_access_token()

    r =
      client(access_token, @service_url)
      |> Tesla.delete(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{"message" => "Authorization has been denied for this request."}
       }} ->
        {:ok, _} = get_access_token(:renew)
        delete_message(conversation_id, activity_id)
    end
  end

  def update_message(conversation_id, activity_id, text, format \\ "plain") do
    path = "/v3/conversations/#{conversation_id}/activities/#{activity_id}"

    {:ok, access_token} = get_access_token()

    r =
      client_with_retry(access_token, @service_url)
      |> Tesla.put(path, %{
        type: "message",
        text: text,
        textFormat: format
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{"message" => "Authorization has been denied for this request."}
       }} ->
        {:ok, _} = get_access_token(:renew)
        update_message(conversation_id, activity_id, text)
    end
  end

  def get_message(tenant_id, team_id, channel_id, message_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/teams/#{team_id}/channels/#{channel_id}/messages/#{message_id}"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_message(tenant_id, team_id, channel_id, message_id)
    end
  end

  def get_message(tenant_id, team_id, channel_id, message_id, nil) do
    get_message(tenant_id, team_id, channel_id, message_id)
  end

  def get_message(tenant_id, team_id, channel_id, message_id, reply_id) do
    service_url = "https://graph.microsoft.com"

    path =
      "/v1.0/teams/#{team_id}/channels/#{channel_id}/messages/#{message_id}/replies/#{reply_id}"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_message(tenant_id, team_id, channel_id, message_id, reply_id)
    end
  end

  def get_user(tenant_id, id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/users/#{id}"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_user(tenant_id, id)
    end
  end

  def get_subscriptions(tenant_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/subscriptions"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_subscriptions(tenant_id)

      {:ok, e} ->
        Logger.error("Error: #{inspect(e)}")
    end
  end

  def get_subscription(tenant_id, subscription_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/subscriptions/#{subscription_id}"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        :not_found

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_subscription(tenant_id, subscription_id)

      {:ok, e} ->
        Logger.error("Error: #{inspect(e)}")
        {:error, e}
    end
  end

  def add_subscription(tenant_id, resource, secret) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/subscriptions"

    {:ok, datetime} = DateTime.now("Etc/UTC")
    datetime = datetime |> DateTime.add(3600, :second)
    expiration_date_time = datetime |> DateTime.to_iso8601()

    {:ok, access_token} = get_graph_access_token(tenant_id)

    notification_url = Fog.env(:msteams_notification_url)

    r =
      client(access_token, service_url)
      |> Tesla.post(path, %{
        changeType: "created,updated,deleted",
        notificationUrl: notification_url,
        resource: resource,
        expirationDateTime: expiration_date_time,
        clientState: secret
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        add_subscription(tenant_id, resource, secret)

      {:ok,
       %Tesla.Env{
         status: 403,
         body: %{
           "error" => %{
             "code" => "ExtensionError",
             "message" =>
               "Operation: Create; Exception: [Status Code: Forbidden; Reason: Caller does not have access to " <>
                   _
           }
         }
       }} ->
        :no_access

      {:ok, %Tesla.Env{status: 403} = response} ->
        Logger.info(
          "Subscription already added for #{{tenant_id, resource}} - #{inspect(response)}"
        )

        :already_added

      {:ok, e} ->
        Logger.error("MS Teams add subscription error: #{inspect(e)}")
        {:error, e}

      {:error, :timeout} = e ->
        # Microsoft doesn't have enough money, so timeout means success
        e
    end
  end

  def renew_subscription(tenant_id, subscription_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/subscriptions/#{subscription_id}"

    {:ok, datetime} = DateTime.now("Etc/UTC")
    datetime = datetime |> DateTime.add(3600, :second)
    expiration_date_time = datetime |> DateTime.to_iso8601()

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client(access_token, service_url)
      |> Tesla.patch(path, %{
        expirationDateTime: expiration_date_time
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        :not_found

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken"
           }
         }
       } = error} ->
        Logger.error("Error: #{inspect(error)}")
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        renew_subscription(tenant_id, subscription_id)

      {:error, :timeout} = e ->
        # Microsoft doesn't have enough money, so timeout means success
        e
    end
  end

  def delete_subscription(tenant_id, subscription_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/subscriptions/#{subscription_id}"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.delete(path)

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        :not_found

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        delete_subscription(tenant_id, subscription_id)
    end
  end

  def get_attachment(tenant_id, team_id, channel_id, message_id, attachment_id) do
    service_url = "https://graph.microsoft.com"

    path =
      "/v1.0/teams/#{team_id}/channels/#{channel_id}/messages/#{message_id}/attachments/#{attachment_id}"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_attachment(tenant_id, team_id, channel_id, message_id, attachment_id)
    end
  end

  def get_files_folder(tenant_id, team_id, channel_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/teams/#{team_id}/channels/#{channel_id}/filesFolder"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_files_folder(tenant_id, team_id, channel_id)
    end
  end

  def get_folder_items(tenant_id, drive_id, folder_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/drives/#{drive_id}/items/#{folder_id}/children"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.get(path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"value" => items} = body
        {:ok, items}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        get_folder_items(tenant_id, drive_id, folder_id)
    end
  end

  def download_drive_item(tenant_id, folder_items, attachment_id) do
    attachment_id = attachment_id |> String.upcase()

    url =
      folder_items
      |> Enum.find_value(fn %{"cTag" => c_tag, "@microsoft.graph.downloadUrl" => url} ->
        if c_tag |> String.contains?(attachment_id), do: url
      end)

    download_from_url(tenant_id, url)
  end

  def download_from_url(tenant_id, url) do
    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, url)
      |> Tesla.get("")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        download_from_url(tenant_id, url)
    end
  end

  def create_upload_session(tenant_id, drive_id, folder_id, filename) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/drives/#{drive_id}/items/#{folder_id}:/#{filename}:/createUploadSession"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.post(path, %{
        "@microsoft.graph.conflictBehavior" => "rename",
        "description" => "Fogbender upload",
        "name" => filename
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        create_upload_session(tenant_id, drive_id, folder_id, filename)
    end
  end

  def upload_file(tenant_id, upload_url, binary) do
    {:ok, access_token} = get_graph_access_token(tenant_id)

    binary_size = byte_size(binary)

    extra_headers = [
      {
        "content-length",
        "#{binary_size}"
      },
      {
        "content-range",
        "bytes 0-#{binary_size - 1}/#{binary_size}"
      }
    ]

    r =
      client_with_retry(access_token, upload_url, extra_headers)
      |> Tesla.put("", binary)

    case r do
      {:ok, %Tesla.Env{status: 202, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 201}} = response ->
        response

      {:ok, %Tesla.Env{status: 200}} = response ->
        response

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        upload_file(tenant_id, upload_url, binary)
    end
  end

  def create_shareable_link(tenant_id, drive_id, file_id) do
    service_url = "https://graph.microsoft.com"
    path = "/v1.0/drives/#{drive_id}/items/#{file_id}/createLink"

    {:ok, access_token} = get_graph_access_token(tenant_id)

    r =
      client_with_retry(access_token, service_url)
      |> Tesla.post(path, %{
        "type" => "view",
        "scope" => "anonymous"
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 401,
         body: %{
           "error" => %{
             "code" => "InvalidAuthenticationToken",
             "message" => "Access token has expired or is not yet valid."
           }
         }
       }} ->
        {:ok, _} = get_graph_access_token(tenant_id, :renew)
        create_shareable_link(tenant_id, drive_id, file_id)
    end
  end

  defp client_jwt() do
    url = "https://login.microsoftonline.com"

    base_url = {Tesla.Middleware.BaseUrl, url}
    form = Tesla.Middleware.FormUrlencoded
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 10,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> true
           {:ok, _} -> false
           {:error, :timeout} -> true
           {:error, _} -> true
         end
       ]}

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "content-type",
           "application/json"
         },
         {
           "accept",
           "*/*"
         }
       ]}

    middleware = [base_url, form, json, query, headers, retry]

    Tesla.client(middleware)
  end

  defp client(access_token, service_url) do
    base_url = {Tesla.Middleware.BaseUrl, service_url}
    # form = Tesla.Middleware.FormUrlencoded
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "content-type",
           "application/json"
         },
         {
           "authorization",
           "Bearer #{access_token}"
         },
         {
           "accept",
           "*/*"
         }
       ]}

    #    retry =
    #      {Tesla.Middleware.Retry,
    #       [
    #         delay: 1000,
    #         max_retries: 10,
    #         max_delay: 4_000,
    #         should_retry: fn
    #           {:ok, %{status: status}} when status in [400, 429, 500] -> true
    #           {:ok, _} -> false
    #           {:error, _} -> true
    #         end
    #       ]}

    #    middleware = [base_url, form, json, query, headers, retry]
    #    middleware = [base_url, form, json, query, headers]
    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end

  defp client_with_retry(access_token, service_url, extra_headers \\ []) do
    base_url = {Tesla.Middleware.BaseUrl, service_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "content-type",
           "application/json"
         },
         {
           "authorization",
           "Bearer #{access_token}"
         },
         {
           "accept",
           "*/*"
         }
       ] ++ extra_headers}

    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 10,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> true
           {:ok, _} -> false
           {:error, :timeout} -> true
           {:error, _} -> true
         end
       ]}

    middleware = [base_url, json, query, headers, retry]

    Tesla.client(middleware)
  end
end
