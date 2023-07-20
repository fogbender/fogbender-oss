defmodule Fog.Comms.Slack.Api do
  require Logger

  @api_url "https://slack.com"
  @files_url "https://files.slack.com"

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["team_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["team_name"]
  end

  def check_access(user_token) do
    r =
      client(user_token)
      |> Tesla.get("/api/team.info")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body, get_nut(r)}
    end
  end

  def team_info(access_token, team_id) do
    r =
      client(access_token)
      |> Tesla.get("/api/team.info",
        query: [
          team: team_id
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def channel_info(access_token, channel_id) do
    r =
      client(access_token)
      |> Tesla.get("/api/conversations.info",
        query: [
          channel: channel_id
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def set_channel_topic(access_token, channel_id, topic) do
    r =
      client(access_token)
      |> Tesla.post("/api/conversations.setTopic", %{
        channel: channel_id,
        topic: topic
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def create_channel(access_token, name, opts \\ []) do
    is_private = opts[:is_private] || false

    r =
      client(access_token)
      |> Tesla.post("/api/conversations.create", %{
        is_private: is_private,
        name: name
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          %{"error" => "name_taken", "ok" => false} ->
            create_channel(access_token, next_channel_name(name), opts)

          _ ->
            {:error, body}
        end

      {:ok, %Tesla.Env{status: 429, body: body}} ->
        {:error, body}
    end
  end

  def next_channel_name(name) do
    case Regex.run(~r/([0-9]+)$/, name, return: :index) do
      nil ->
        "#{name}0"

      [_, {start, length}] ->
        slice = name |> String.slice(0, start)
        number = name |> String.slice(start, length)
        {x, _} = Integer.parse(number)

        x = (x + 1) |> Integer.to_string()

        x =
          case length > String.length(x) do
            true ->
              x |> String.pad_leading(length, "0")

            false ->
              x
          end

        "#{slice}#{x}"
    end
  end

  def join_channel(access_token, channel_id) do
    r =
      client(access_token)
      |> Tesla.post("/api/conversations.join", %{
        channel: channel_id
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          %{"error" => "method_not_supported_for_channel_type", "ok" => false} ->
            {:ok, :private_channel}

          _ ->
            {:error, body}
        end
    end
  end

  def leave_channel(access_token, channel_id) do
    r =
      client(access_token)
      |> Tesla.post("/api/conversations.leave", %{
        channel: channel_id
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def remove_user_from_channel(access_token, channel_id, user_id) do
    r =
      client(access_token)
      |> Tesla.post("/api/conversations.kick", %{
        channel: channel_id,
        user: user_id
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          %{"error" => "not_in_channel", "ok" => false} = error ->
            {:ok, error}

          _ ->
            {:error, body}
        end
    end
  end

  def invite_user_to_channel(access_token, channel_id, user_id) do
    r =
      client(access_token)
      |> Tesla.post("/api/conversations.invite", %{
        channel: channel_id,
        users: user_id
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  # send message in slack thread
  def send_message(
        access_token,
        channel_id,
        thread_ts,
        name,
        avatar_url,
        text,
        meta \\ nil,
        blocks \\ [],
        reply_broadcast \\ false
      ) do
    data = %{
      channel: channel_id,
      username: name,
      icon_url: avatar_url,
      text: text,
      thread_ts: thread_ts,
      metadata: meta,
      blocks: blocks,
      reply_broadcast: reply_broadcast
    }

    # delete from map if value is nil
    data = data |> Enum.reject(fn {_, v} -> is_nil(v) end) |> Map.new()

    r =
      json_client(access_token)
      |> Tesla.post("/api/chat.postMessage", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  # send ephemeral message in slack thread
  def send_ephemeral(access_token, channel_id, user_id, thread_ts, text, meta \\ nil) do
    r =
      json_client(access_token)
      |> Tesla.post("/api/chat.postEphemeral", %{
        channel: channel_id,
        user: user_id,
        text: text,
        thread_ts: thread_ts,
        metadata: meta
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def add_reaction(
        access_token,
        channel_id,
        timestamp,
        name
      ) do
    data = %{
      channel: channel_id,
      timestamp: timestamp,
      name: name
    }

    r =
      json_client(access_token)
      |> Tesla.post("/api/reactions.add", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def remove_reaction(
        access_token,
        channel_id,
        timestamp,
        name
      ) do
    data = %{
      channel: channel_id,
      timestamp: timestamp,
      name: name
    }

    r =
      json_client(access_token)
      |> Tesla.post("/api/reactions.remove", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def update_message(
        access_token,
        channel_id,
        ts,
        text
      ) do
    data = %{
      channel: channel_id,
      ts: ts,
      text: text
    }

    r =
      json_client(access_token)
      |> Tesla.post("/api/chat.update", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def delete_message(
        access_token,
        channel_id,
        ts
      ) do
    data = %{
      channel: channel_id,
      ts: ts
    }

    r =
      json_client(access_token)
      |> Tesla.post("/api/chat.delete", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def upload_file(
        access_token,
        channel_id,
        thread_ts,
        filename,
        content_type,
        content,
        text
      ) do
    mp =
      Tesla.Multipart.new()
      |> Tesla.Multipart.add_file_content(
        content,
        filename,
        headers: [{"Content-Type", content_type || "application/octet-stream"}]
      )
      |> Tesla.Multipart.add_field("initial_comment", text)
      |> Tesla.Multipart.add_field("channels", channel_id)

    mp =
      case thread_ts do
        nil ->
          mp

        _ ->
          mp |> Tesla.Multipart.add_field("thread_ts", thread_ts)
      end

    r =
      upload_client(access_token)
      |> Tesla.post("/api/files.upload", mp)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  # get message by id
  # https://api.slack.com/messaging/retrieving#individual_messages
  def get_message(access_token, channel_id, message_ts) do
    r =
      json_client(access_token)
      |> Tesla.get("/api/conversations.history",
        query: [
          channel: channel_id,
          latest: message_ts,
          include_all_metadata: true,
          inclusive: true,
          limit: 1
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def generate_thread_meta(room_id, meta \\ %{}) do
    %{
      event_type: "fogbender_thread",
      event_payload:
        Map.merge(meta, %{
          room_id: room_id
        })
    }
  end

  def parse_thread_meta(%{
        "event_type" => "fogbender_thread",
        "event_payload" => %{"room_id" => room_id}
      }) do
    {:ok, room_id}
  end

  def oauth_code(code) do
    client_id = Fog.env(:slack_client_id)
    client_secret = Fog.env(:slack_client_secret)

    oauth_code(code, client_id, client_secret)
  end

  def oauth_code(code, slack_client_id, slack_client_secret) do
    r =
      oauth_client()
      |> Tesla.post(
        "/api/oauth.v2.access",
        %{
          client_id: slack_client_id,
          client_secret: slack_client_secret,
          code: code
          # grant_type: "authorization_code",
          # redirect_uri: Fog.env(:slack_redirect_uri)
          # scope: "[\"api\"]"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{
          "ok" => true,
          "token_type" => "bot",
          "access_token" => access_token,
          "authed_user" => %{"id" => user_id},
          "bot_user_id" => bot_user_id,
          "team" => %{"id" => team_id}
        } = body

        :console.log(access_token, user_id, bot_user_id, team_id)

        # security: send access token to client only in encrypted form
        # because we don't know at this point for what integration
        # that token is going to be used so we can't store the token in DB yet
        user_token =
          Fog.Integration.OAuth.encrypt(
            access_token,
            ""
          )

        {:ok,
         %{
           "ok" => true,
           "user" => %{
             "deleted" => false,
             "real_name" => username,
             "profile" => %{
               "image_192" => pictureUrl
             }
           }
         }} = users_info(access_token, user_id)

        user_info = %{
          "username" => username,
          "pictureUrl" => pictureUrl,
          "botUserId" => bot_user_id,
          "userId" => user_id
        }

        {:ok, %{userToken: user_token, userInfo: user_info}}

      _ ->
        {:error, r}
    end
  end

  def users_list(access_token) do
    r =
      client(access_token)
      |> Tesla.get("/api/users.list")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end

      {:ok, %Tesla.Env{status: 429, body: body}} ->
        {:error, body}
    end
  end

  def users_info(access_token, user_id) do
    r =
      client(access_token)
      |> Tesla.get("/api/users.info", query: [user: user_id])

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end
    end
  end

  def file_info(access_token, file_id) do
    r =
      client(access_token)
      |> Tesla.get("/api/files.info", query: [file: file_id])

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"ok" => true} = body}} ->
        {:ok, body}

      _ ->
        {:error, r}
    end
  end

  def download_file(access_token, path) do
    r =
      files_client(access_token)
      |> Tesla.get("/" <> path)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def message_permalink(access_token, channel_id, message_ts) do
    r =
      client(access_token)
      |> Tesla.get("/api/chat.getPermalink", query: [channel: channel_id, message_ts: message_ts])

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end

      {:ok, %Tesla.Env{status: 429, body: body}} ->
        {:error, body}
    end
  end

  def shared_channels_list(access_token, team_id) do
    {:ok, %{"channels" => channels}} = channels_list(access_token, team_id)
    {:ok, channels |> Enum.filter(&(&1["is_ext_shared"] === true))}
  end

  def channels_list(access_token, team_id) do
    r =
      client(access_token)
      |> Tesla.get("/api/conversations.list",
        query: [
          exclude_archived: true,
          team_id: team_id,
          limit: 1000,
          types: "public_channel,private_channel"
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        case body do
          %{"ok" => true} ->
            {:ok, body}

          _ ->
            {:error, body}
        end

      {:ok, %Tesla.Env{status: 429, body: body}} ->
        {:error, body}
    end
  end

  # get new user_token
  defp get_nut({:ok, %Tesla.Env{opts: opts}}) do
    Keyword.get(opts, :new_user_token)
  end

  defp oauth_client() do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    form = Tesla.Middleware.FormUrlencoded
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    headers =
      {Tesla.Middleware.Headers,
       [
         #  {"content-type", "application/json; charset=utf-8"}
         #  Content-type: application/json;
       ]}

    middleware = [base_url, form, json, query, headers]

    Tesla.client(middleware)
  end

  defp client(access_token) do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    form = Tesla.Middleware.FormUrlencoded
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

    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 10,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> true
           {:ok, _} -> false
           {:error, _} -> true
         end
       ]}

    middleware = [base_url, form, json, query, headers, retry]

    Tesla.client(middleware)
  end

  defp upload_client(access_token) do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "authorization",
           "Bearer #{access_token}"
         },
         {
           "accept",
           "*/*"
         }
       ]}

    middleware = [base_url, json, headers]

    Tesla.client(middleware)
  end

  defp json_client(access_token) do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
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

    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end

  defp files_client(access_token) do
    base_url = {Tesla.Middleware.BaseUrl, @files_url}

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "authorization",
           "Bearer #{access_token}"
         },
         {
           "accept",
           "*/*"
         }
       ]}

    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 500,
         max_retries: 10,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 500] -> true
           {:ok, _} -> false
           {:error, _} -> true
         end
       ]}

    middleware = [base_url, headers, retry]

    Tesla.client(middleware)
  end
end
