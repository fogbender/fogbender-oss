defmodule Fog.GitHub.Hook do
  require Logger

  import Ecto.Query

  alias Fog.{Data, Repo}

  use Task

  def consume(args) do
    Task.Supervisor.start_child(Fog.TaskSupervisor, fn -> run(args) end)

    :ok
  end

  def run(headers: headers, payload: json) do
    headers
    |> Enum.find(fn {key, _value} -> key == "x-hub-signature-256" end)
    |> case do
      nil ->
        nil

      {_key, "sha256=" <> signature} ->
        webhook_secret = Fog.env(:github_app_webhook_secret)

        case :crypto.mac(:hmac, :sha256, webhook_secret, json) |> Base.encode16(case: :lower) do
          ^signature ->
            handle(Jason.decode!(json))

          _ ->
            Logger.error("GitHub App: could not verify signature for payload #{inspect(json)}")
        end
    end
  end

  defp handle(
         %{"action" => "created", "installation" => %{"id" => installation_id}} =
           data
       ) do
    case data do
      %{issue: _} ->
        :ok

      _ ->
        Data.GitHubInstall.new(%{
          installation_id: installation_id
        })
        |> Repo.insert!()
    end
  end

  defp handle(
         %{"action" => "deleted", "installation" => %{"id" => installation_id}, "issue" => issue} =
           _data
       )
       when is_nil(issue) do
    installation_id = "#{installation_id}"

    integration =
      from(
        i in Data.WorkspaceIntegration,
        where: i.type == "github",
        where: i.specifics["installation_id"] == ^"#{installation_id}"
      )
      |> Repo.one()
      |> Repo.preload(:workspace)

    :ok = Fog.Repo.Workspace.delete_integration(integration, integration.workspace)
  end

  defp handle(%{"installation" => %{"id" => installation_id}} = data) do
    integration =
      from(
        i in Data.WorkspaceIntegration,
        where: i.type == "github",
        where: i.specifics["installation_id"] == ^"#{installation_id}"
      )
      |> Repo.one()
      |> Repo.preload(:workspace)

    {:ok, widget_id} = Repo.Workspace.to_widget_id(integration.workspace)

    payload = %Fog.Integration.GitHubHook{widget_id: widget_id, data: data}

    Fog.Integration.GitHubHook.run(payload)
  end

  defp handle(_) do
    :ok
  end
end
