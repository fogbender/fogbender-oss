defmodule Fog.Issue.Search do
  import Ecto.Query, only: [from: 2]

  require Logger

  alias Fog.{Data, Integration, Repo}
  alias Integration.{GitLab, Linear, GitHub, Asana, Jira, Height, Trello}

  def run(_sess, %{workspace_id: wid, term: term}) do
    workspace = Repo.Workspace.get(wid) |> Repo.preload(:integrations)

    workspace.integrations
    |> Enum.reduce([], fn
      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "gitlab",
        specifics: specifics
      },
      acc ->
        access_token = specifics["access_token"]

        case GitLab.search(access_token, project_id, term) do
          {:ok, issues} ->
            issues =
              issues
              |> Enum.map(fn i ->
                Map.merge(i, %{
                  integration_id: integration_id,
                  integration_project_id: project_id
                })
              end)

            [issues | acc]

          {:error, error} ->
            Logger.error("GitLab.search failed: #{error}")
            acc
        end

      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "linear",
        specifics: specifics
      },
      acc ->
        api_key = specifics["api_key"]

        case Linear.search(api_key, term) do
          {:ok, issues} ->
            issues =
              issues
              |> Enum.map(fn i ->
                Map.merge(i, %{
                  integration_id: integration_id,
                  integration_project_id: project_id
                })
              end)

            [issues | acc]

          {:error, error} ->
            Logger.error("Linear.search failed: #{error}")
            acc
        end

      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "github",
        specifics: specifics
      },
      acc ->
        installation_id = specifics["installation_id"]
        {:ok, api_key} = Integration.GitHub.installation_to_token(installation_id)
        repo = specifics["repo"]

        case GitHub.search(api_key, "#{term} state:open type:issue repo:#{repo}") do
          {:ok, issues} ->
            issues =
              issues
              |> Enum.map(fn i ->
                Map.merge(i, %{
                  integration_id: integration_id,
                  integration_project_id: project_id
                })
              end)

            [issues | acc]

          {:error, error} ->
            Logger.error("GitHub.search failed: #{error}")
            acc
        end

      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "asana",
        specifics: specifics
      },
      acc ->
        api_key = specifics["api_key"]

        task =
          from(
            e in Fog.Data.IntegrationLog,
            where: e.type == "asana",
            where: e.integration_project_id == ^project_id,
            where: e.workspace_id == ^workspace.id,
            where: not is_nil(json_extract_path(e.data, ["workspace", "gid"])),
            order_by: [desc: :inserted_at],
            limit: 1
          )
          |> Fog.Repo.one()

        case task do
          %Fog.Data.IntegrationLog{data: %{"workspace" => %{"gid" => asana_workspace_gid}}}
          when not is_nil(asana_workspace_gid) ->
            case Asana.search(api_key, asana_workspace_gid, project_id, term) do
              {:ok, issues} ->
                issues =
                  issues
                  |> Enum.map(fn i ->
                    Map.merge(i, %{
                      integration_id: integration_id,
                      integration_project_id: project_id
                    })
                  end)

                [issues | acc]

              {:error, error} ->
                Logger.error("Asana.search failed: #{error}")
                acc
            end

          _ ->
            acc
        end

      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "jira",
        specifics: specifics
      },
      acc ->
        jira_url = specifics["jira_url"]
        jira_user = specifics["jira_user"]
        token = specifics["token"]

        case Jira.search(jira_url, jira_user, token, project_id, term) do
          {:ok, issues} ->
            issues =
              issues
              |> Enum.map(fn i ->
                Map.merge(i, %{
                  integration_id: integration_id,
                  integration_project_id: project_id
                })
              end)

            [issues | acc]

          {:error, error} ->
            Logger.error("Jira.search failed: #{error}")
            acc
        end

      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "height",
        specifics: specifics
      } = integration,
      acc ->
        user_token = specifics["user_token"]
        fogbender_list_id = specifics["fogbender_list_id"]

        case Height.search(user_token, fogbender_list_id, term) do
          {:ok, issues, maybe_user_token} ->
            Integration.store_user_token_if_needed(integration, maybe_user_token)

            issues =
              issues
              |> Enum.map(fn i ->
                Map.merge(i, %{
                  integration_id: integration_id,
                  integration_project_id: project_id
                })
              end)

            [issues | acc]

          {:error, error} ->
            Logger.error("Height.search failed: #{error}")
            acc
        end

      %Data.WorkspaceIntegration{
        id: integration_id,
        project_id: project_id,
        type: "trello",
        specifics: specifics
      },
      acc ->
        token = specifics["token"]

        case Trello.search(token, term) do
          {:ok, issues} ->
            issues =
              issues
              |> Enum.map(fn i ->
                Map.merge(i, %{
                  integration_id: integration_id,
                  integration_project_id: project_id
                })
              end)

            [issues | acc]

          {:error, error} ->
            Logger.error("Trello.search failed: #{error}")
            acc
        end

      _, acc ->
        acc
    end)
    |> List.flatten()
  end
end
