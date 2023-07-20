defmodule Fog.Integration.GitLab do
  @behaviour Fog.Integration.Behaviour

  require Logger

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["access_token"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_name"]
  end

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":gitlab:#{i.project_id}"
  end

  def commands(_), do: nil

  defp host(), do: Fog.env(:gitlab_host)
  defp api_url(), do: "#{host()}/api/v4"

  def check_access(access_token, project_path) do
    r =
      client(access_token)
      |> Tesla.get("/projects/#{project_path |> URI.encode_www_form()}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_issue(access_token, project_id, title, body \\ "test") do
    r =
      client(access_token)
      |> Tesla.post("/projects/#{project_id}/issues", %{
        title: title,
        description: body,
        labels: ["fogbender"]
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

  def issue_info(access_token, project_id, issue_iid) do
    r =
      client(access_token)
      |> Tesla.get("/projects/#{project_id}/issues/#{issue_iid}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issue(body)}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def create_comment(access_token, project_id, issue_iid, body \\ "test") do
    create_note(access_token, project_id, issue_iid, body)
  end

  def create_note(access_token, project_id, issue_iid, body \\ "test") do
    r =
      client(access_token)
      |> Tesla.post("/projects/#{project_id}/issues/#{issue_iid}/notes", %{
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

  def search(access_token, project_id, term) do
    url = Tesla.build_url("/projects/#{project_id}/search", scope: "issues", search: term)

    r =
      client(access_token)
      |> Tesla.get(url)

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, normalize_issues(body, [])}

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def delete_issue(access_token, project_id, issue_iid) do
    r =
      client(access_token)
      |> Tesla.delete("/projects/#{project_id}/issues/#{issue_iid}")

    case r do
      {:ok, %Tesla.Env{status: 204}} ->
        :ok

      {:ok, %Tesla.Env{status: 404}} ->
        {:error, :not_found}

      {:ok, %Tesla.Env{status: 403}} ->
        {:error, :not_authorized}
    end
  end

  def close_issue(access_token, project_id, issue_iid) do
    r =
      client(access_token)
      |> Tesla.put("/projects/#{project_id}/issues/#{issue_iid}", %{
        state_event: "close"
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

  def reopen_issue(access_token, project_id, issue_iid) do
    r =
      client(access_token)
      |> Tesla.put("/projects/#{project_id}/issues/#{issue_iid}", %{
        state_event: "reopen"
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

  def add_labels_to_issue(access_token, project_id, issue_iid, labels \\ ["fogbender"]) do
    r =
      client(access_token)
      |> Tesla.put("/projects/#{project_id}/issues/#{issue_iid}", %{
        add_labels: labels,
        updated_at: DateTime.utc_now() |> DateTime.to_iso8601()
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

  defp client(token) do
    base_url = {Tesla.Middleware.BaseUrl, api_url()}
    json = Tesla.Middleware.JSON
    headers = {Tesla.Middleware.Headers, [{"authorization", "Bearer " <> token}]}

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
      "id" => gid,
      "iid" => id,
      "labels" => labels,
      "state" => state,
      "title" => title
    } = i

    labels = labels |> Enum.map(&%{id: &1, title: &1})

    url = i["webUrl"] || i["web_url"]

    %{
      type: "gitlab",
      id: id,
      number: id,
      issueId: gid,
      state: state,
      title: title,
      url: url,
      labels: labels
    }
  end
end
