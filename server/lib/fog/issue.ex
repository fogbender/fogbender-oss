defmodule Fog.Issue do
  alias Fog.{Data, Repo, Issue}

  def search(sess, details) do
    Issue.Search.run(sess, details)
  end

  def create_from_log() do
    import Ecto.Query

    stream =
      from(il in Data.IntegrationLog,
        join: wi in Data.WorkspaceIntegration,
        on:
          wi.workspace_id == il.workspace_id and
            wi.type == il.type and
            wi.project_id == il.integration_project_id,
        order_by: [asc: il.inserted_at],
        select: {wi, il.data}
      )
      |> Repo.stream()
      |> Stream.each(fn {integration, data} ->
        create_from_json(integration, data)
      end)

    Repo.transaction(
      fn -> Stream.run(stream) end,
      timeout: :infinity
    )
  end

  def create_from_json(integration, data) do
    case parse(integration, data) do
      nil ->
        :ok

      params ->
        Repo.IntegrationIssue.insert_or_update(params)
        :ok
    end
  end

  def parse(%Data.WorkspaceIntegration{type: type} = integration, data) do
    if is_issue(type, data) do
      %{
        workspace_id: integration.workspace_id,
        type: integration.type,
        project_id: integration.project_id,
        issue_id: to_string(id(type, data)),
        issue_number: to_string(number(type, data)),
        url: url(type, data),
        name: name(type, data),
        state: state(type, data)
      }
    end
  end

  defp is_issue("asana" = type, data) do
    data["resource_type"] == "task" and
      is_valid_issue(type, data)
  end

  defp is_issue(type, data), do: is_valid_issue(type, data)

  defp is_valid_issue(type, data) do
    Enum.all?([
      id(type, data),
      number(type, data),
      url(type, data),
      name(type, data)
    ])
  end

  defp number("gitlab", data), do: data["object_attributes"]["iid"]
  defp number("github", data), do: data["issue"]["number"]
  defp number("asana", data), do: data["gid"]
  defp number("linear", data), do: data["data"]["id"]
  defp number("jira", data), do: data["issue"]["key"]
  defp number("height", data), do: data["data"]["model"]["task"]["index"]
  defp number("trello", data), do: data["action"]["data"]["card"]["id"]

  defp id("github", data), do: data["issue"]["number"]
  defp id("linear", data), do: data["data"]["number"]
  defp id("trello", data), do: data["action"]["data"]["card"]["idShort"]
  defp id(type, data), do: number(type, data)

  defp url("gitlab", data), do: data["object_attributes"]["url"]
  defp url("github", data), do: data["issue"]["html_url"]
  defp url("asana", data), do: data["permalink_url"]
  defp url("linear", data), do: data["url"]
  defp url("jira", data), do: data["issue"]["url"]
  defp url("height", data), do: data["data"]["model"]["task"]["url"]

  defp url("trello", data),
    do: "https://trello.com/c/#{data["action"]["data"]["card"]["shortLink"]}"

  def name("gitlab", data), do: data["object_attributes"]["title"]
  def name("github", data), do: data["issue"]["title"]
  def name("asana", data), do: data["name"]
  def name("linear", data), do: data["data"]["title"]
  def name("jira", data), do: data["issue"]["fields"]["summary"]
  def name("height", data), do: data["data"]["model"]["task"]["name"]
  def name("trello", data), do: data["action"]["data"]["card"]["name"]

  def state("github", data), do: normalize_state(data["issue"]["state"])

  def state("linear", data) do
    normalize_state(data["data"]["state"]["type"])
  end

  def state("height", data), do: normalize_state(data["data"]["model"]["task"]["status"])
  def state("asana", data), do: normalize_state(data["completed"])

  def state("trello", data) do
    list_name = data["action"]["data"]["card"]["idList"]

    if list_name do
      normalize_state(data["action"]["data"]["listAfter"]["name"])
    else
      normalize_state(data["action"]["data"]["list"]["name"])
    end
  end

  def state("jira", data) do
    normalize_state(data["issue"]["fields"]["status"]["statusCategory"]["key"])
  end

  def state("gitlab", data), do: normalize_state(data["object_attributes"]["state"])

  def normalize_state(true), do: "closed"
  def normalize_state("closed"), do: "closed"
  def normalize_state("done"), do: "closed"
  def normalize_state("Done"), do: "closed"
  def normalize_state("completed"), do: "closed"
  def normalize_state(_), do: "open"

  def id_from_create_data("gitlab", %{"iid" => id}), do: {:ok, id}
  def id_from_create_data("github", %{"number" => id}), do: {:ok, id}
  def id_from_create_data("linear", %{number: id}), do: {:ok, id}
  def id_from_create_data("asana", %{"gid" => id}), do: {:ok, id}
  def id_from_create_data("jira", %{"key" => key}), do: {:ok, key}
  def id_from_create_data("height", %{"index" => index}), do: {:ok, index}
  def id_from_create_data("trello", %{"idShort" => id}), do: {:ok, id}

  def meta_tag(%Data.IntegrationIssue{type: "gitlab", project_id: project_id, issue_id: id}),
    do: ":gitlab:#{project_id}:#{id}"

  def meta_tag(%Data.IntegrationIssue{
        type: "github",
        project_id: project_id,
        issue_number: number
      }),
      do: ":github:#{project_id}:#{number}"

  def meta_tag(%Data.IntegrationIssue{type: "linear", project_id: project_id, issue_id: id}),
    do: ":linear:#{project_id}:#{id}"

  def meta_tag(%Data.IntegrationIssue{type: "asana", project_id: project_id, issue_id: id}),
    do: ":asana:#{project_id}:#{id}"

  def meta_tag(%Data.IntegrationIssue{type: "jira", project_id: project_id, issue_number: number}),
    do: ":jira:#{project_id}:#{number}"

  def meta_tag(%Data.IntegrationIssue{
        type: "height",
        project_id: project_id,
        issue_number: number
      }),
      do: ":height:#{project_id}:#{number}"

  def meta_tag(%Data.IntegrationIssue{
        type: "trello",
        project_id: project_id,
        issue_number: number
      }),
      do: ":trello:#{project_id}:#{number}"

  def meta_tag(%{type: "gitlab"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.id}"
  def meta_tag(%{type: "github"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.number}"
  def meta_tag(%{type: "linear"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.id}"
  def meta_tag(%{type: "asana"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.id}"
  def meta_tag(%{type: "jira"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.number}"
  def meta_tag(%{type: "height"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.number}"
  def meta_tag(%{type: "trello"} = i), do: ":#{i.type}:#{i.integration_project_id}:#{i.number}"
end
