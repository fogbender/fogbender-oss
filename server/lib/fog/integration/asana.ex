defmodule Fog.Integration.Asana do
  @behaviour Fog.Integration.Behaviour

  require Logger

  use Tesla

  plug(Tesla.Middleware.Timeout, timeout: 2_000)

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["api_key"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_name"]
  end

  def commands(_), do: nil

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":asana:#{i.project_id}"
  end

  def get_project(api_key, project_id) do
    r =
      client(api_key)
      |> Tesla.get("/projects/#{project_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_projects(api_key) do
    r =
      client(api_key)
      |> Tesla.get("/projects")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_tags(api_key, workspace_id) do
    r =
      client(api_key)
      |> Tesla.get("/tags?workspace=#{workspace_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_tag(api_key, project_id) do
    {:ok, data} = get_project(api_key, project_id)
    workspace_id = data["workspace"]["gid"]

    {:ok, data} = get_tags(api_key, workspace_id)

    r =
      case data |> Enum.find(&(&1["name"] == "fogbender")) do
        nil ->
          client(api_key)
          |> Tesla.post("/tags", %{
            data: %{
              color: "light-purple",
              name: "fogbender",
              workspace: workspace_id
            }
          })

        tag ->
          client(api_key)
          |> Tesla.get("/tags/#{tag["gid"]}")
      end

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def delete_tag(api_key, tag_id) do
    r =
      client(api_key)
      |> Tesla.delete("/tags/#{tag_id}")

    case r do
      {:ok, %Tesla.Env{status: 200}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_webhooks(api_key, project_id) do
    {:ok, data} = get_project(api_key, project_id)
    workspace_id = data["workspace"]["gid"]

    r =
      client(api_key)
      |> Tesla.get("/webhooks?workspace=#{workspace_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_webhook(api_key, project_id, url) do
    {:ok, data} = get_webhooks(api_key, project_id)

    r =
      case data |> Enum.find(&(&1["target"] == url)) do
        nil ->
          client(api_key)
          |> Tesla.post("/webhooks", %{
            data: %{
              target: url,
              resource: project_id,
              filters: [
                %{resource_type: "task"},
                %{resource_type: "story"}
              ]
            }
          })

        webhook ->
          client(api_key)
          |> Tesla.get("/webhooks/#{webhook["gid"]}")
      end

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def delete_webhook(api_key, webhook_id) do
    r =
      client(api_key)
      |> Tesla.delete("/webhooks/#{webhook_id}")

    case r do
      {:ok, %Tesla.Env{status: 200}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_task(api_key, task_id) do
    r =
      client(api_key)
      |> Tesla.get("/tasks/#{task_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_task(api_key, project_id, title, tag_id, body \\ "test") do
    r =
      client(api_key)
      |> Tesla.post("/tasks", %{
        data: %{
          projects: [project_id],
          name: title,
          tags: [tag_id],
          notes: body
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def delete_task(api_key, task_id) do
    r =
      client(api_key)
      |> Tesla.delete("/tasks/#{task_id}")

    case r do
      {:ok, %Tesla.Env{status: 200}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def issue_info(api_key, task_id) do
    r =
      client(api_key)
      |> Tesla.get("/tasks/#{task_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"data" => issue}}} ->
        {:ok, normalize_issue(api_key, issue)}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def close_issue(api_key, task_id) do
    r =
      client(api_key)
      |> Tesla.put("/tasks/#{task_id}", %{
        data: %{
          completed: true
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def reopen_issue(api_key, task_id) do
    r =
      client(api_key)
      |> Tesla.put("/tasks/#{task_id}", %{
        data: %{
          completed: false
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_comment(api_key, task_id, body \\ "test") do
    r =
      client(api_key)
      |> Tesla.post("/tasks/#{task_id}/stories", %{
        data: %{
          text: body
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 201}} ->
        {:ok, :ok}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_comment(api_key, story_id) do
    r =
      client(api_key)
      |> Tesla.get("/stories/#{story_id}/")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_user(api_key, user_id) do
    r =
      client(api_key)
      |> Tesla.get("/users/#{user_id}/")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body["data"]}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def me(api_key) do
    client(api_key) |> Tesla.get("/users/me")
  end

  def search(api_key, asana_workspace_gid, project_id, term) do
    r =
      client(api_key)
      |> Tesla.get(
        "/workspaces/#{asana_workspace_gid}/tasks/search?text=#{term}&projects.any=#{project_id}"
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issues(api_key, body["data"], [])}

      {:ok, %Tesla.Env{status: 400}} ->
        {:error, :bad_request}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 402}} ->
        {:error, :subscription_required}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  defp host(), do: Fog.env(:asana_host)
  defp api_url(), do: "#{host()}/api/1.0"

  defp client(token) do
    middleware = [
      {Tesla.Middleware.BaseUrl, api_url()},
      Tesla.Middleware.JSON,
      {Tesla.Middleware.Headers,
       [
         {
           "authorization",
           "Bearer " <> token
         },
         {
           "accept",
           "application/json"
         }
       ]}
    ]

    Tesla.client(middleware)
  end

  defp normalize_issues(_, [], acc) do
    acc
  end

  defp normalize_issues(api_key, [h | t], acc) do
    issue = normalize_issue(api_key, h)
    normalize_issues(api_key, t, [issue | acc])
  end

  defp normalize_issue(api_key, %{"gid" => id, "name" => title, "resource_type" => "task"}) do
    {:ok, task} = get_task(api_key, id)

    %{"permalink_url" => url, "completed" => completed, "tags" => labels} = task

    labels =
      (labels || [])
      |> Enum.map(fn %{"gid" => id, "name" => title} ->
        %{
          id: id,
          title: title
        }
      end)

    state = if completed, do: "closed", else: "open"

    %{
      type: "asana",
      id: id,
      number: id,
      issueId: id,
      state: state,
      title: title,
      url: url,
      labels: labels
    }
  end
end
