defmodule Fog.Integration.Linear do
  @behaviour Fog.Integration.Behaviour

  require Logger

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["api_key"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["project_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["team_name"]
  end

  def commands(_), do: nil

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":linear:#{i.project_id}"
  end

  @url "https://api.linear.app/graphql"

  @issue_query """
    id
    number
    title
    url
    state {
      name
    }
    labels {
      nodes {
        id
        name
      }
    }
  """

  def check_access(api_key) do
    r =
      Neuron.query(
        """
          query {
            teams {
              nodes {
                id
                name
                key
                organization{
                  name
                  urlKey
                }
              }
            }
          }
        """,
        %{},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => data}}} ->
        {:ok, data}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, e}
    end
  end

  def get_workflow_states(api_key, team_id) do
    r =
      Neuron.query(
        """
            query WorkflowStates($teamId: ID) {
              workflowStates(filter: {team: {id: {eq: $teamId}}}) {
                edges{
                  node {
                    id
                    name
                  }
                }
              }
            }
        """,
        %{teamId: team_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => data}}} ->
        %{"workflowStates" => %{"edges" => states}} = data
        {:ok, states}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def get_labels(api_key, team_id) do
    r =
      Neuron.query(
        """
            query IssueLabels($teamId: ID) {
              issueLabels(filter: {team: { id: {eq: $teamId } } }) {
                edges{
                  node {
                    id
                    name
                    team {
                      id
                    }
                  }
                }
              }
            }
        """,
        %{teamId: team_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => data}}} ->
        {:ok, data}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def create_label(api_key, team_id, name \\ "fogbender") do
    r =
      Neuron.query(
        """
         mutation CreateLabel($teamId: String!, $labelName: String!) {
          issueLabelCreate( input: { teamId: $teamId, name: $labelName }) {
           success
          }
         }
        """,
        %{teamId: team_id, labelName: name},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    x =
      case r do
        {:ok, %Neuron.Response{body: %{"data" => %{"errors" => errors}}}} when is_list(errors) ->
          if errors |> Enum.any?(&(&1["message"] == "duplicate label name")) do
            {:ok, %{}}
          else
            {:error, errors}
          end

        {:ok, %Neuron.Response{body: %{"data" => data}}} ->
          {:ok, data}

        e ->
          Logger.error("#{inspect(e)}")
          {:error, :need_reason}
      end

    case x do
      {:ok, _} ->
        case get_labels(api_key, team_id) do
          {:ok, data} ->
            {:ok,
             data["issueLabels"]["edges"]
             |> Enum.find(
               &(&1["node"]["name"] == "fogbender" && &1["node"]["team"]["id"] === team_id)
             )
             |> (fn x -> x["node"] end).()}

          e ->
            e
        end

      e ->
        e
    end
  end

  def delete_label(api_key, label_id) do
    r =
      Neuron.query(
        """
         mutation ArchiveLabel($id: String!) {
          issueLabelArchive(id: $id) {
           success
          }
         }
        """,
        %{id: label_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"issueLabelArchive" => %{"success" => true}}}}} ->
        :ok

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def delete_issue(api_key, issue_id) do
    r =
      Neuron.query(
        """
         mutation ArchiveIssue($id: String!) {
          issueDelete(id: $id) {
           success
          }
         }
        """,
        %{id: issue_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"issueDelete" => %{"success" => true}}}}} ->
        :ok

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def close_issue(api_key, team_id, issue_id) do
    {:ok, states} = get_workflow_states(api_key, team_id)

    done_state = states |> Enum.find(&(&1["node"]["name"] === "Done"))

    r =
      Neuron.query(
        """
        mutation CloseIssue($issueId: String!, $stateId: String!) {
          issueUpdate(id: $issueId, input: {stateId: $stateId}){
            success
            issue {
              #{@issue_query}
            }
          }
        }
        """,
        %{issueId: issue_id, stateId: done_state["node"]["id"]},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok,
       %Neuron.Response{
         body: %{"data" => %{"issueUpdate" => %{"success" => true, "issue" => issue}}}
       }} ->
        {:ok, normalize_issue(issue)}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def reopen_issue(api_key, team_id, issue_id) do
    {:ok, states} = get_workflow_states(api_key, team_id)

    done_state = states |> Enum.find(&(&1["node"]["name"] === "Backlog"))

    r =
      Neuron.query(
        """
        mutation ReopenIssue($issueId: String!, $stateId: String!) {
          issueUpdate(id: $issueId, input: {stateId: $stateId}){
            success
            issue {
              #{@issue_query}
            }
          }
        }
        """,
        %{issueId: issue_id, stateId: done_state["node"]["id"]},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok,
       %Neuron.Response{
         body: %{"data" => %{"issueUpdate" => %{"success" => true, "issue" => issue}}}
       }} ->
        {:ok, normalize_issue(issue)}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def get_webhooks(api_key) do
    r =
      Neuron.query(
        """
            query {
              webhooks {
                edges{
                  node {
                    id
                    url
                    team {
                      id
                    }
                  }
                }
              }
            }
        """,
        %{},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => data}}} ->
        {:ok, data}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def create_webhook(api_key, team_id, url, secret) do
    r =
      Neuron.query(
        """
         mutation CreateWebhook($url: String!, $teamId: String!, $secret: String!) {
          webhookCreate(
           input: {
            label: "fogbender",
            url: $url,
            teamId: $teamId,
            secret: $secret,
            resourceTypes: ["Issue", "Comment", "IssueLabel"]
           }
          ) {
           success
           webhook {
            id
            enabled
           }
          }
         }
        """,
        %{teamId: team_id, url: url, secret: secret},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    x =
      case r do
        {:ok, %Neuron.Response{body: %{"data" => %{"errors" => errors}}}} when is_list(errors) ->
          if errors |> Enum.any?(&(&1["message"] == "url not unique")) do
            {:ok, %{}}
          else
            {:error, errors}
          end

        {:ok, %Neuron.Response{body: %{"data" => data}}} ->
          {:ok, data}

        e ->
          Logger.error("#{inspect(e)}")
          {:error, :need_reason}
      end

    case x do
      {:ok, _} ->
        case get_webhooks(api_key) do
          {:ok, data} ->
            {:ok,
             data["webhooks"]["edges"]
             |> Enum.find(&(&1["node"]["url"] == url && &1["node"]["team"]["id"] == team_id))
             |> (fn x -> x["node"] end).()}

          e ->
            e
        end

      e ->
        e
    end
  end

  def create_issue(api_key, team_id, title, label_id, description \\ "test") do
    r =
      Neuron.query(
        """
          mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $label_id: String!) {
            issueCreate(input: {title: $title, description: $description, teamId: $teamId, labelIds: [$label_id]}) {
              success
              issue {
                #{@issue_query}
              }
            }
          }
        """,
        %{teamId: team_id, title: title, description: description, label_id: label_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"issueCreate" => %{"issue" => data}}}}} ->
        {:ok, normalize_issue(data)}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def delete_webhook(api_key, webhook_id) do
    r =
      Neuron.query(
        """
         mutation DeleteWebhook($id: String!) {
          webhookDelete(id: $id) {
           success
          }
         }
        """,
        %{id: webhook_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"webhookDelete" => %{"success" => true}}}}} ->
        :ok

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def issue_info(api_key, issue_id) do
    r =
      Neuron.query(
        """
          query GetIssue($issueId: String!) {
            issue(id: $issueId) {
              #{@issue_query}
            }
          }
        """,
        %{issueId: issue_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"issue" => issue}}}} ->
        {:ok, normalize_issue(issue)}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def user_info(api_key, user_id) do
    r =
      Neuron.query(
        """
          query GetUser($userId: String!) {
            user(id: $userId) {
              name,
              email,
              avatarUrl
            }
          }
        """,
        %{userId: user_id},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"user" => user}}}} ->
        {:ok, user}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def add_labels_to_issue(api_key, issue_id, label_ids) do
    r =
      Neuron.query(
        """
          mutation IssueUpdate($input: IssueUpdateInput!, $issueUpdateId: String!) {
            issueUpdate(input: $input, id: $issueUpdateId) {
              issue {
                id
                labels {
                  nodes {
                    id
                    name
                  }
                }
              }
           }
          }
        """,
        %{issueUpdateId: issue_id, input: %{labelIds: label_ids}},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"issueUpdate" => %{"issue" => data}}}}} ->
        {:ok, data}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def create_comment(api_key, issue_id, body \\ "test") do
    r =
      Neuron.query(
        """
          mutation CreateComment($issueId: String!, $body: String!) {
            commentCreate(input: {issueId: $issueId, body: $body}) {
              success
              comment {
                id
                body
              }
            }
          }
        """,
        %{issueId: issue_id, body: body},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"commentCreate" => %{"comment" => data}}}}} ->
        {:ok, data}

      e ->
        Logger.error("#{inspect(e)}")
        {:error, :need_reason}
    end
  end

  def search(api_key, term) do
    r =
      Neuron.query(
        """
          query SearchIssues($term: String!) {
            issueSearch(query: $term) {
              nodes {
                #{@issue_query}
              }
            }
          }
        """,
        %{term: term},
        url: @url,
        headers: [authorization: "#{api_key}"],
        connection_opts: [recv_timeout: 15_000]
      )

    case r do
      {:ok, %Neuron.Response{body: %{"data" => %{"issueSearch" => %{"nodes" => issues}}}}} ->
        {:ok, normalize_issues(issues, [])}

      error ->
        {:error, error}
    end
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
      "labels" => labels,
      "state" => state,
      "title" => title,
      "url" => url,
      "number" => number
    } = i

    labels =
      (labels["nodes"] || [])
      |> Enum.map(fn %{"id" => id, "name" => title} ->
        %{
          id: id,
          title: title
        }
      end)

    %{
      type: "linear",
      id: id,
      number: number,
      issueId: id,
      state: state["name"],
      title: title,
      url: url,
      labels: labels
    }
  end
end
