defmodule Fog.Integration.GitHub do
  @behaviour Fog.Integration.Behaviour

  require Logger

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["api_key"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["repository_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["repo"]
  end

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":github:#{i.project_id}"
  end

  def commands(%Fog.Data.WorkspaceIntegration{}), do: nil

  def get_user(api_key) do
    r =
      client(api_key)
      |> Tesla.get("/user")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_info(api_key, repository_id) do
    {:ok, data} = get_user(api_key)
    owner = data["login"]

    r =
      client(api_key)
      |> Tesla.get("/repos/#{owner}/#{repository_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_orgs(api_key) do
    r =
      client(api_key)
      |> Tesla.get("/user/orgs")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_repositories(api_key), do: get_repositories(api_key, 1, [])

  def get_repositories(api_key, page, acc) do
    r =
      client(api_key)
      |> Tesla.get("/user/repos", query: [per_page: 100, page: page])

    case r do
      {:ok, %Tesla.Env{status: 200, body: []}} ->
        {:ok, acc}

      {:ok, %Tesla.Env{status: 200, body: body}} ->
        get_repositories(api_key, page + 1, [body | acc] |> List.flatten())

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_issues(api_key, repo, on_page) do
    get_issues(api_key, repo, 1, on_page)
  end

  def get_issues(api_key, repo, page, on_page) do
    IO.inspect("issues page #{page}")

    r =
      client(api_key)
      |> Tesla.get("/repos/#{repo}/issues",
        query: [state: "all", per_page: 100, page: page, direction: "asc"]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: []}} ->
        :ok

      {:ok, %Tesla.Env{status: 200, body: body}} ->
        :ok = on_page.(body)
        get_issues(api_key, repo, page + 1, on_page)

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_issue_comments(api_key, repo, issue_number) do
    get_issue_comments(api_key, repo, issue_number, 1, [])
  end

  def get_issue_comments(api_key, repo, issue_number, page, acc) do
    r =
      client(api_key)
      |> Tesla.get("/repos/#{repo}/issues/#{issue_number}/comments",
        query: [per_page: 100, page: page]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: []}} ->
        {:ok, acc}

      {:ok, %Tesla.Env{status: 200, body: body}} ->
        get_issue_comments(api_key, repo, issue_number, page + 1, [body | acc] |> List.flatten())

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_label(api_key, repo) do
    r =
      client(api_key)
      |> Tesla.get("/repos/#{repo}/labels/fogbender")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_label(api_key, repo) do
    r =
      client(api_key)
      |> Tesla.post("/repos/#{repo}/labels", %{
        name: "fogbender",
        color: "7E0CF5"
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 422,
         body: %{
           "errors" => [
             %{
               "code" => "already_exists"
             }
           ]
         }
       }} ->
        {:ok, _} = get_label(api_key, repo)

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def delete_label_from_issue(api_key, repo, issue_number, label) do
    r = client(api_key) |> Tesla.delete("/repos/#{repo}/issues/#{issue_number}/labels/#{label}")

    case r do
      {:ok, %Tesla.Env{status: 200}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def add_labels_to_issue(api_key, repo, issue_number, labels \\ ["fogbender"]) do
    labels
    |> Enum.each(fn label ->
      # deleting first to trigger webhook
      case delete_label_from_issue(api_key, repo, issue_number, label) do
        :ok ->
          :ok

        {:error, :not_found} ->
          :ok
      end
    end)

    r =
      client(api_key)
      |> Tesla.post("/repos/#{repo}/issues/#{issue_number}/labels", %{
        labels: labels
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def get_webhooks(api_key, repo) do
    r =
      client(api_key)
      |> Tesla.get("/repos/#{repo}/hooks")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_webhook(api_key, repo, url) do
    r =
      client(api_key)
      |> Tesla.post("/repos/#{repo}/hooks", %{
        config: %{
          url: url,
          content_type: "json"
        },
        events: ["issues", "issue_comment"]
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 422,
         body: %{
           "errors" => [
             %{
               "message" => "Hook already exists on this repository"
             }
           ]
         }
       }} ->
        {:ok, hooks} = get_webhooks(api_key, repo)
        hook = hooks |> Enum.find(fn x -> x["config"]["url"] === url end)
        {:ok, hook}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_issue(api_key, repo, title, body \\ "test") do
    r =
      client(api_key)
      |> Tesla.post("/repos/#{repo}/issues", %{
        title: title,
        body: body,
        labels: ["fogbender"]
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def close_issue(api_key, repo, issue_number) do
    r =
      client(api_key)
      |> Tesla.patch("/repos/#{repo}/issues/#{issue_number}", %{
        state: "closed"
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issue(body)}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def reopen_issue(api_key, repo, issue_number) do
    r =
      client(api_key)
      |> Tesla.patch("/repos/#{repo}/issues/#{issue_number}", %{
        state: "open",
        state_reason: "reopened"
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issue(body)}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def delete_webhook(api_key, repo, webhook_id) do
    r = client(api_key) |> Tesla.delete("/repos/#{repo}/hooks/#{webhook_id}")

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_comment(api_key, repo, issue_number, body \\ "test") do
    r =
      client(api_key)
      |> Tesla.post("/repos/#{repo}/issues/#{issue_number}/comments", %{
        body: body
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def issue_info(api_key, repo, issue_number) do
    r =
      client(api_key)
      |> Tesla.get("/repos/#{repo}/issues/#{issue_number}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issue(body)}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def search(api_key, term) do
    url = Tesla.build_url("/search/issues", q: term)

    r =
      client(api_key)
      |> Tesla.get(url)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issues(body["items"], [])}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}

      {:ok, %Tesla.Env{status: 401}} ->
        {:error, :bad_credentials}
    end
  end

  defp host(), do: Fog.env(:github_host)
  defp api_url(), do: host()

  defp client(token) do
    base_url = {Tesla.Middleware.BaseUrl, api_url()}
    json = Tesla.Middleware.JSON

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "authorization",
           "Bearer " <> token
         },
         {
           "accept",
           "application/vnd.github.v3+json"
         }
       ]}

    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 5,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> true
           {:ok, _} -> false
           {:error, :timeout} -> true
           {:error, _} -> true
         end
       ]}

    middleware = [base_url, json, headers, retry]

    Tesla.client(middleware)
  end

  defp normalize_issues([], acc) do
    acc
  end

  defp normalize_issues([h | t], acc) do
    issue = normalize_issue(h)
    normalize_issues(t, [issue | acc])
  end

  defp normalize_issue(i) do
    %{
      "id" => id,
      "number" => number,
      "labels" => labels,
      "state" => state,
      "title" => title,
      "html_url" => url
    } = i

    labels =
      (labels || [])
      |> Enum.map(fn %{"id" => id, "name" => title} ->
        %{
          id: id,
          title: title
        }
      end)

    %{
      type: "github",
      id: number,
      number: number,
      issueId: id,
      state: state,
      title: title,
      url: url,
      labels: labels
    }
  end
end
