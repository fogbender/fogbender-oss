defmodule Fog.Integration.Jira do
  @behaviour Fog.Integration.Behaviour

  require Logger

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["token"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_name"]
  end

  def commands(_), do: nil

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":jira:#{i.project_id}"
  end

  def check_access(jira_url, jira_user, token, project_id) do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.get("/project/#{project_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

        # {:ok, %Tesla.Env{status: 400}} ->
        #   {:error, :bad_request}

        # {:ok, %Tesla.Env{status: 401}} ->
        #   {:error, :not_authorized}

        # {:ok, %Tesla.Env{status: 404}} ->
        #   {:error, :not_found}
    end
  end

  def create_issue(jira_url, jira_user, token, project_id, title, text \\ "test") do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.post("/issue", %{
        fields: %{
          issuetype: %{name: "Task"},
          project: %{key: project_id},
          labels: ["fogbender"],
          summary: title,
          description: document_format(text)
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

        # {:ok, %Tesla.Env{status: 400}} ->
        #   {:error, :bad_request}

        # {:ok, %Tesla.Env{status: 401}} ->
        #   {:error, :not_authorized}

        # {:ok, %Tesla.Env{status: 403}} ->
        #   {:error, :not_authorized}
    end
  end

  def add_labels_to_issue(jira_url, jira_user, token, issue_id, labels \\ ["fogbender"]) do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.put("/issue/#{issue_id}", %{
        update: %{
          labels: labels |> Enum.map(&%{add: &1})
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok
    end
  end

  def delete_issue(jira_url, jira_user, token, issue_id) do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.delete("/issue/#{issue_id}")

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok

        # {:ok, %Tesla.Env{status: 400}} ->
        #   {:error, :bad_request}

        # {:ok, %Tesla.Env{status: 401}} ->
        #   {:error, :not_authorized}

        # {:ok, %Tesla.Env{status: 403}} ->
        #   {:error, :not_authorized}

        # {:ok, %Tesla.Env{status: 404}} ->
        #   {:error, :not_found}
    end
  end

  def issue_info(token, jira_url, jira_user, issue_id) do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.get("/issue/#{issue_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issue(body, jira_url)}
    end
  end

  def get_transitions(token, jira_url, jira_user, issue_id) do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.get("/issue/#{issue_id}/transitions")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def close_issue(token, jira_url, jira_user, issue_id) do
    {:ok, %{"transitions" => transitions}} = get_transitions(token, jira_url, jira_user, issue_id)

    transition_id = transitions |> Enum.find_value(&if &1["name"] === "Done", do: &1["id"])

    true = not is_nil(transition_id)

    r =
      client(jira_url, jira_user, token)
      |> Tesla.post("/issue/#{issue_id}/transitions", %{
        transition: %{
          id: transition_id
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok
    end
  end

  def reopen_issue(token, jira_url, jira_user, issue_id) do
    {:ok, %{"transitions" => transitions}} = get_transitions(token, jira_url, jira_user, issue_id)

    transition_id = transitions |> Enum.find_value(&if &1["name"] === "To Do", do: &1["id"])

    true = not is_nil(transition_id)

    r =
      client(jira_url, jira_user, token)
      |> Tesla.post("/issue/#{issue_id}/transitions", %{
        transition: %{
          id: transition_id
        }
      })

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok
    end
  end

  def create_comment(token, jira_url, jira_user, issue_id, text \\ "test") do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.post("/issue/#{issue_id}/comment", %{
        body: document_format(text)
      })

    case r do
      {:ok, %Tesla.Env{status: 201, body: body}} ->
        {:ok, body}

        # {:ok, %Tesla.Env{status: 400}} ->
        #   {:error, :bad_request}

        # {:ok, %Tesla.Env{status: 401}} ->
        #   {:error, :not_authorized}

        # {:ok, %Tesla.Env{status: 404}} ->
        #   {:error, :not_found}
    end
  end

  def search(jira_url, jira_user, token, project_id, text) do
    r =
      client(jira_url, jira_user, token)
      |> Tesla.post("/search", %{
        jql: "project = #{project_id} & labels = \"fogbender\" & text ~ \"#{text}\"",
        fields: [
          "summary",
          "labels",
          "status"
        ]
      })

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        issues = body["issues"] |> Enum.map(fn i -> normalize_issue(i, jira_url) end)
        {:ok, issues}

        # {:ok, %Tesla.Env{status: 400}} ->
        #   {:error, :bad_request}

        # {:ok, %Tesla.Env{status: 401}} ->
        #   {:error, :not_authorized}
    end
  end

  defp normalize_issue(i, jira_url) do
    %{
      "id" => id,
      "key" => key,
      "fields" => %{
        "labels" => labels,
        "summary" => title,
        "status" => %{"name" => state}
      }
    } = i

    labels = labels |> Enum.map(&%{id: &1, title: &1})

    %{
      type: "jira",
      id: id,
      number: key,
      issueId: id,
      state: state,
      title: title,
      labels: labels,
      url: jira_url <> "/browse/" <> key
    }
  end

  defp api_url(jira_url), do: "#{jira_url}/rest/api/3"

  defp client(jira_url, jira_user, token) do
    auth = Base.encode64("#{jira_user}:#{token}")

    middleware = [
      {Tesla.Middleware.BaseUrl, api_url(jira_url)},
      Tesla.Middleware.JSON,
      {Tesla.Middleware.Headers,
       [
         {
           "authorization",
           "Basic #{auth}"
         },
         {
           "accept",
           "application/json"
         }
       ]}
    ]

    Tesla.client(middleware)
  end

  defp document_format(text) do
    %{
      version: 1,
      type: "doc",
      content:
        SimpleMarkdown.convert(text,
          parser: Fog.Api.Markdown.rules(),
          render: &Fog.Integration.Jira.ADF.render/1
        )
    }
  end
end
