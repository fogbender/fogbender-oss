defmodule Fog.Integration.Height do
  @behaviour Fog.Integration.Behaviour

  require Logger

  @api_url "https://api.height.app"

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["user_token"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["workspace_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["workspace_name"]
  end

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":height:#{i.project_id}"
  end

  def commands(_), do: nil

  def check_access(user_token) do
    r =
      client(user_token)
      |> Tesla.get("/workspace")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body, get_nut(r)}
    end
  end

  def get_fogbender_list(user_token) do
    r =
      client(user_token)
      |> Tesla.get("/lists")

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"list" => lists}}} ->
        case lists |> Enum.find(fn %{"key" => key} -> key == "fogbender" end) do
          nil ->
            :not_found

          list ->
            {:ok, list}
        end
    end
  end

  def get_lists(user_token) do
    r =
      client(user_token)
      |> Tesla.get("/lists")

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"list" => lists}}} ->
        {:ok, lists}
    end
  end

  def create_fogbender_list(user_token) do
    r =
      client(user_token)
      |> Tesla.post("/lists", %{
        name: "fogbender",
        type: "list"
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 400,
         body: %{"error" => %{"message" => "A list already exists with this key."}}
       }} ->
        get_fogbender_list(user_token)
    end
  end

  def remove_task_from_list(user_token, task_id, list_id) do
    data = %{
      patches: [
        %{
          taskIds: [task_id],
          effects: [
            %{
              type: "lists",
              remove: [list_id]
            }
          ]
        }
      ]
    }

    r =
      client(user_token)
      |> Tesla.patch("/tasks", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"list" => [task]} = body
        {:ok, task}
    end
  end

  def add_task_to_list(user_token, task_id, list_id) do
    # Remove first, to trigger hook event if it's actually a noop
    {:ok, _} = remove_task_from_list(user_token, task_id, list_id)

    data = %{
      patches: [
        %{
          taskIds: [task_id],
          effects: [
            %{
              type: "lists",
              add: [list_id]
            }
          ]
        }
      ]
    }

    r =
      client(user_token)
      |> Tesla.patch("/tasks", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"list" => [task]} = body
        {:ok, task}
    end
  end

  def issue_info(user_token, task_id) do
    r =
      client(user_token)
      |> Tesla.get("/tasks/#{task_id}")

    {:ok, lists} = get_lists(user_token)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issue(body, lists)}
    end
  end

  def create_task(user_token, fogbender_list_id, title, text \\ "test") do
    r =
      client(user_token)
      |> Tesla.post("/tasks", %{
        name: title,
        listIds: [fogbender_list_id]
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        %{"id" => task_id} = body
        user_token = get_nut(r) || user_token
        {:ok, _, maybe_new_token} = create_comment(user_token, task_id, text)
        {:ok, body, maybe_new_token || get_nut(r)}
    end
  end

  def create_comment(access_token, task_id, text \\ "test") do
    r =
      client(access_token)
      |> Tesla.post("/activities", %{
        taskId: task_id,
        type: "comment",
        message: text
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body, get_nut(r)}
    end
  end

  def search(user_token, _list_id, term) do
    r =
      client(user_token)
      |> Tesla.get("/tasks",
        query: [
          filters:
            %{
              status: %{values: ["backLog", "inProgress"]},
              completed: %{values: [false]},
              trashed: %{values: [false]}
            }
            |> Jason.encode()
            |> elem(1),
          query: term
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"list" => issues} = body
        {:ok, normalize_issues(issues), get_nut(r)}
    end
  end

  def delete_task(access_token, task_id) do
    data = %{
      patches: [
        %{
          taskIds: [task_id],
          effects: [
            %{
              type: "deleted",
              deleted: true
            }
          ]
        }
      ]
    }

    r =
      client(access_token)
      |> Tesla.patch("/tasks", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"list" => [task]} = body
        {:ok, task}
    end
  end

  def close_issue(access_token, task_id) do
    data = %{
      patches: [
        %{
          taskIds: [task_id],
          effects: [
            %{
              type: "status",
              status: "done",
              completedAt: DateTime.utc_now() |> DateTime.to_iso8601()
            }
          ]
        }
      ]
    }

    r =
      client(access_token)
      |> Tesla.patch("/tasks", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"list" => [task]} = body
        {:ok, task}
    end
  end

  def reopen_issue(access_token, task_id) do
    data = %{
      patches: [
        %{
          taskIds: [task_id],
          effects: [
            %{
              type: "status",
              status: "backLog"
            }
          ]
        }
      ]
    }

    r =
      client(access_token)
      |> Tesla.patch("/tasks", data)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{"list" => [task]} = body
        {:ok, task}
    end
  end

  def get_webhooks(user_token) do
    r =
      client(user_token)
      |> Tesla.get("/webhooks")

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"list" => webhooks}}} ->
        {:ok, webhooks}

      {:ok,
       %Tesla.Env{
         status: 400,
         body: %{"error" => error}
       }} ->
        {:error, error}
    end
  end

  def create_webhook(access_token, webhook_url) do
    r =
      client(access_token)
      |> Tesla.post("/webhooks", %{
        url: webhook_url,
        events: [
          "task.created",
          "task.updated",
          "task.deleted",
          "activity.created",
          "activity.updated",
          "activity.deleted"
        ]
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 400,
         body: %{"error" => error}
       }} ->
        {:error, error}
    end
  end

  def delete_webhook(access_token, webhook_id) do
    r =
      client(access_token)
      |> Tesla.delete("/webhooks/#{webhook_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 400,
         body: %{"error" => error}
       }} ->
        {:error, error}
    end
  end

  def user(user_token, user_id) do
    r =
      client(user_token)
      |> Tesla.get("/users")

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"list" => users}}} ->
        user = users |> Enum.find(fn %{"id" => id} -> id == user_id end)
        {:ok, user}
    end
  end

  def oauth_code(code) do
    r =
      oauth_client()
      |> Tesla.post(
        "/oauth/tokens",
        %{
          client_id: Fog.env(:height_client_id),
          client_secret: Fog.env(:height_client_secret),
          code: code,
          grant_type: "authorization_code",
          redirect_uri: Fog.env(:height_redirect_uri),
          scope: "[\"api\"]"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{
          "access_token" => access_token,
          "refresh_token" => refresh_token
        } = body

        # security: send access token to client only in encrypted form
        # because we don't know at this point for what integration
        # that token is going to be used so we can't store the token in DB yet
        user_token =
          Fog.Integration.OAuth.encrypt(
            access_token,
            refresh_token
          )

        {:ok,
         %{
           "email" => email,
           "username" => username,
           "pictureUrl" => pictureUrl,
           "state" => "enabled"
         }} = users_me(access_token)

        user_info = %{
          "email" => email,
          "username" => username,
          "pictureUrl" => pictureUrl
        }

        {:ok, %{userToken: user_token, userInfo: user_info}}

      _ ->
        {:error, r}
    end
  end

  def users_me(access_token) do
    r =
      client(access_token)
      |> Tesla.get("/users/me")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  defp normalize_issues(issues) do
    normalize_issues(issues, [])
  end

  defp normalize_issues([], acc) do
    acc
  end

  defp normalize_issues([h | t], acc) do
    issue = normalize_issue(h)
    normalize_issues(t, [issue | acc])
  end

  defp normalize_issue(i, lists \\ []) do
    %{
      "id" => id,
      "index" => number,
      "url" => url,
      "name" => title,
      "status" => state,
      "listIds" => issue_list_ids
    } = i

    labels =
      lists
      |> Enum.filter(&(&1["id"] in issue_list_ids))
      |> Enum.map(&%{id: &1["id"], title: &1["key"]})

    %{
      type: "height",
      id: id,
      number: number,
      issueId: id,
      state: state,
      title: title,
      url: url,
      labels: labels
    }
  end

  # get new user_token
  defp get_nut({:ok, %Tesla.Env{opts: opts}}) do
    Keyword.get(opts, :new_user_token)
  end

  defp oauth_client() do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end

  defp client(user_token) do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    refresh_token =
      {Fog.Lib.RefreshTokenMiddleware,
       user_token: user_token,
       has_expired: fn
         #  {:ok, %{body: %{"error" => %{"message" => "This access token is expired"}}}} ->
         {:ok, %{status: 401}} ->
           true

         _ ->
           false
       end,
       exchange_token: fn refresh_token ->
         r =
           oauth_client()
           |> Tesla.post(
             "/oauth/tokens",
             %{
               client_id: Fog.env(:height_client_id),
               client_secret: Fog.env(:height_client_secret),
               refresh_token: refresh_token,
               grant_type: "refresh_token",
               redirect_uri: Fog.env(:height_redirect_uri),
               scope: "[\"api\"]"
             }
           )

         case r do
           {:ok, %Tesla.Env{status: 200, body: body}} ->
             %{
               "access_token" => access_token,
               "refresh_token" => refresh_token
             } = body

             {:ok,
              %{
                "access_token" => access_token,
                "refresh_token" => refresh_token
              }}
         end
       end}

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, json, query, headers, refresh_token]

    Tesla.client(middleware)
  end
end
