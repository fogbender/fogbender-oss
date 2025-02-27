defmodule Fog.Integration do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Ai, Api, Data, Integration, Repo, Comms, Utils}

  alias Fog.Api.Integration.{
    CloseIssue,
    CreateIssue,
    CreateIssueWithForward,
    IssueInfo,
    ForwardToIssue,
    LabelIssue,
    ReopenIssue
  }

  @info %{
    "gitlab" => %{
      name: "GitLab",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/gitlab-icon-rgb-96.png",
      meta_type: "issue_tracker",
      module: Integration.GitLab
    },
    "linear" => %{
      name: "Linear",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/linear_96.png",
      meta_type: "issue_tracker",
      module: Integration.Linear
    },
    "github" => %{
      name: "GitHub",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/github-96.png",
      meta_type: "issue_tracker",
      module: Integration.GitHub
    },
    "asana" => %{
      name: "Asana",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/asana_96.png",
      meta_type: "issue_tracker",
      module: Integration.Asana
    },
    "jira" => %{
      name: "Jira",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/jira-96.png",
      meta_type: "issue_tracker",
      module: Integration.Jira
    },
    "height" => %{
      name: "Height",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/height-96.png",
      meta_type: "issue_tracker",
      module: Integration.Height
    },
    "trello" => %{
      name: "Trello",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/trello-96.png",
      meta_type: "issue_tracker",
      module: Integration.Trello
    },
    "slack" => %{
      name: "Slack (Agent)",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/slack.png",
      meta_type: "comms",
      module: Comms.Slack.Agent
    },
    "msteams" => %{
      name: "Microsoft Teams",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/ms_teams_96.png",
      meta_type: "comms",
      module: Comms.MsTeams
    },
    "slack-customer" => %{
      name: "Slack (Customer)",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/slack.png",
      meta_type: "comms",
      module: Comms.Slack.Customer
    },
    "hubspot" => %{
      name: "HubSpot",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/hubspot_96.png",
      meta_type: "crm",
      module: nil
    },
    "ai" => %{
      name: "AI",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/ai_192.png",
      meta_type: "ai",
      module: Ai
    },
    "pagerduty" => %{
      name: "PagerDuty",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/pagerduty.png",
      meta_type: "incident_response",
      module: Integration.PagerDuty
    },
    "salesforce" => %{
      name: "Salesforce",
      avatar_url: "https://fog-bot-avatars.s3.amazonaws.com/salesforce_96.png",
      meta_type: "crm",
      module: nil
    }
  }

  def info(type), do: @info[type]
  def providers(), do: Map.keys(@info)
  def by_meta_type(meta_type), do: providers() |> Enum.filter(&(info(&1).meta_type === meta_type))

  def file_issue_command(%Data.WorkspaceIntegration{type: type}),
    do: "file #{info(type).name} issue"

  def url(%Data.WorkspaceIntegration{type: "gitlab"} = i), do: Integration.GitLab.url(i)
  def url(%Data.WorkspaceIntegration{type: "linear"} = i), do: Integration.Linear.url(i)
  def url(%Data.WorkspaceIntegration{type: "github"} = i), do: Integration.GitHub.url(i)
  def url(%Data.WorkspaceIntegration{type: "asana"} = i), do: Integration.Asana.url(i)
  def url(%Data.WorkspaceIntegration{type: "jira"} = i), do: Integration.Jira.url(i)
  def url(%Data.WorkspaceIntegration{type: "height"} = i), do: Integration.Height.url(i)
  def url(%Data.WorkspaceIntegration{type: "trello"} = i), do: Integration.Trello.url(i)
  def url(%Data.WorkspaceIntegration{type: "slack"} = i), do: Comms.Slack.Api.url(i)
  def url(%Data.WorkspaceIntegration{type: "msteams"}), do: "https://teams.com"

  def name(%Data.WorkspaceIntegration{type: "gitlab"} = i), do: Integration.GitLab.name(i)
  def name(%Data.WorkspaceIntegration{type: "linear"} = i), do: Integration.Linear.name(i)
  def name(%Data.WorkspaceIntegration{type: "github"} = i), do: Integration.GitHub.name(i)
  def name(%Data.WorkspaceIntegration{type: "asana"} = i), do: Integration.Asana.name(i)
  def name(%Data.WorkspaceIntegration{type: "jira"} = i), do: Integration.Jira.name(i)
  def name(%Data.WorkspaceIntegration{type: "height"} = i), do: Integration.Height.name(i)
  def name(%Data.WorkspaceIntegration{type: "trello"} = i), do: Integration.Trello.name(i)
  def name(%Data.WorkspaceIntegration{type: "slack"} = i), do: Comms.Slack.Api.name(i)
  def name(%Data.WorkspaceIntegration{type: "msteams"}), do: "Microsoft Teams"

  def handle(
        %{workspaceId: workspace_id, integrationProjectId: integration_project_id} = cmd,
        sess
      ) do
    integration = Repo.Integration.get_by_project_id(workspace_id, integration_project_id)
    handle(integration, cmd, sess)
  end

  def handle(%Data.WorkspaceIntegration{type: "github"} = i, %IssueInfo{issueId: issue_id}, _sess) do
    %{module: module} = info("github")
    token = module.token(i)
    repo = i.specifics["repo"]
    {:ok, _} = module.issue_info(token, repo, issue_id)
  end

  def handle(%Data.WorkspaceIntegration{type: "gitlab"} = i, %IssueInfo{issueId: issue_id}, _sess) do
    %{module: module} = info("gitlab")
    token = module.token(i)
    project_id = i.project_id
    {:ok, _} = module.issue_info(token, project_id, issue_id)
  end

  def handle(%Data.WorkspaceIntegration{type: "trello"} = i, %IssueInfo{issueId: issue_id}, _sess) do
    %{module: module} = info("trello")
    token = module.token(i)

    %Data.IntegrationIssue{issue_number: issue_number} =
      Data.IntegrationIssue |> Repo.get_by(issue_id: issue_id)

    {:ok, _} = module.issue_info(token, issue_number)
  end

  def handle(%Data.WorkspaceIntegration{type: "linear"} = i, %IssueInfo{issueId: issue_id}, _sess) do
    %{module: module} = info("linear")
    token = module.token(i)

    %Data.IntegrationIssue{issue_number: issue_number} =
      Data.IntegrationIssue |> Repo.get_by(issue_id: issue_id)

    {:ok, _} = module.issue_info(token, issue_number)
  end

  def handle(%Data.WorkspaceIntegration{type: "jira"} = i, %IssueInfo{issueId: issue_id}, _sess) do
    %{module: module} = info("jira")
    jira_url = i.specifics["jira_url"]
    jira_user = i.specifics["jira_user"]
    token = i.specifics["token"]
    {:ok, _} = module.issue_info(token, jira_url, jira_user, issue_id)
  end

  def handle(%Data.WorkspaceIntegration{type: type} = i, %IssueInfo{issueId: issue_id}, _sess) do
    %{module: module} = info(type)
    token = module.token(i)
    {:ok, _} = module.issue_info(token, issue_id)
  end

  def handle(
        %Data.WorkspaceIntegration{type: "github"} = i,
        %CloseIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %{module: module} = info("github")
    token = module.token(i)
    repo = i.specifics["repo"]

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, repo, issue_id, comment),
         {:ok, issue} <- module.close_issue(token, repo, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: "gitlab", project_id: project_id} = i,
        %CloseIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %{module: module} = info("gitlab")
    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, project_id, issue_id, comment),
         {:ok, issue} <- module.close_issue(token, project_id, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: type} = i,
        %CloseIssue{issueId: issue_number, roomId: room_id},
        sess
      )
      when type === "height" do
    %{module: module} = info(type)
    token = module.token(i)

    {:ok, %{issueId: issue_id}} = module.issue_info(token, issue_number)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _, _} <- module.create_comment(token, issue_id, comment),
         {:ok, issue} <- module.close_issue(token, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: "trello"} = i,
        %CloseIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %Data.IntegrationIssue{issue_number: issue_number} =
      Data.IntegrationIssue |> Repo.get_by(issue_id: issue_id)

    %{module: module} = info("trello")
    token = module.token(i)
    id_board = i.project_id

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, issue_number, comment),
         {:ok, issue} <- module.close_issue(token, id_board, issue_number) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: "asana"} = i,
        %CloseIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %{module: module} = info("asana")
    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, issue_id, comment),
         {:ok, issue} <- module.close_issue(token, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{
          type: type,
          specifics: specifics,
          workspace_id: wid,
          project_id: pid
        } = i,
        %CloseIssue{issueId: issue_number, roomId: room_id},
        sess
      )
      when type === "linear" do
    %{module: module} = info(type)
    %{"team_id" => team_id} = specifics

    %{issue_number: issue_id} =
      Repo.get_by(Data.IntegrationIssue,
        workspace_id: wid,
        project_id: pid,
        type: type,
        issue_id: issue_number
      )

    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, issue_id, comment),
         {:ok, issue} <- module.close_issue(token, team_id, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{
          type: type,
          specifics: specifics
        } = i,
        %CloseIssue{issueId: issue_id, roomId: room_id},
        sess
      )
      when type === "jira" do
    %{module: module} = info(type)
    %{"jira_url" => jira_url, "jira_user" => jira_user} = specifics
    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Closed [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, jira_url, jira_user, issue_id, comment),
         :ok <- module.close_issue(token, jira_url, jira_user, issue_id),
         {:ok, issue} <- module.issue_info(token, jira_url, jira_user, issue_id) do
      {:ok, issue}
    end
  end

  def handle(%Data.WorkspaceIntegration{type: type} = i, %CloseIssue{issueId: issue_id}, _sess) do
    %{module: module} = info(type)
    token = module.token(i)
    {:ok, _} = module.close_issue(token, issue_id)
  end

  def handle(
        %Data.WorkspaceIntegration{type: "github"} = i,
        %ReopenIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %{module: module} = info("github")
    token = module.token(i)
    repo = i.specifics["repo"]

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, repo, issue_id, comment),
         {:ok, issue} <- module.reopen_issue(token, repo, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: "gitlab", project_id: project_id} = i,
        %ReopenIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %{module: module} = info("gitlab")
    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, project_id, issue_id, comment),
         {:ok, issue} <- module.reopen_issue(token, project_id, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: type} = i,
        %ReopenIssue{issueId: issue_number, roomId: room_id},
        sess
      )
      when type === "height" do
    %{module: module} = info(type)
    token = module.token(i)
    {:ok, %{issueId: issue_id}} = module.issue_info(token, issue_number)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _, _} <- module.create_comment(token, issue_id, comment),
         {:ok, issue} <- module.reopen_issue(token, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: "trello"} = i,
        %ReopenIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %Data.IntegrationIssue{issue_number: issue_number} =
      Data.IntegrationIssue |> Repo.get_by(issue_id: issue_id)

    %{module: module} = info("trello")
    token = module.token(i)
    id_board = i.project_id

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, issue_number, comment),
         {:ok, issue} <- module.reopen_issue(token, id_board, issue_number) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{type: "asana"} = i,
        %ReopenIssue{issueId: issue_id, roomId: room_id},
        sess
      ) do
    %{module: module} = info("asana")
    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, issue_id, comment),
         {:ok, issue} <- module.reopen_issue(token, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{
          type: type,
          specifics: specifics,
          workspace_id: wid,
          project_id: pid
        } = i,
        %ReopenIssue{issueId: issue_number, roomId: room_id},
        sess
      )
      when type === "linear" do
    %{module: module} = info(type)
    %{"team_id" => team_id} = specifics

    %{issue_number: issue_id} =
      Repo.get_by(Data.IntegrationIssue,
        workspace_id: wid,
        project_id: pid,
        type: type,
        issue_id: issue_number
      )

    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, issue_id, comment),
         {:ok, issue} <- module.reopen_issue(token, team_id, issue_id) do
      {:ok, issue}
    end
  end

  def handle(
        %Data.WorkspaceIntegration{
          type: type,
          specifics: specifics
        } = i,
        %ReopenIssue{issueId: issue_id, roomId: room_id},
        sess
      )
      when type === "jira" do
    %{module: module} = info(type)
    %{"jira_url" => jira_url, "jira_user" => jira_user} = specifics
    token = module.token(i)

    with author <- Utils.get_author(sess),
         room <- Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace]),
         room_url <- Utils.room_url(room.vendor.id, room.workspace.id, room.id),
         comment <- "Reopened [from Fogbender](#{room_url}) by #{author.name}",
         {:ok, _} <- module.create_comment(token, jira_url, jira_user, issue_id, comment),
         :ok <- module.reopen_issue(token, jira_url, jira_user, issue_id),
         {:ok, issue} <- module.issue_info(token, jira_url, jira_user, issue_id) do
      {:ok, issue}
    end
  end

  def create_issue(
        %{
          workspaceId: workspace_id,
          integrationProjectId: integration_project_id
        } = command
      ) do
    integration = Repo.Integration.get_by_project_id(workspace_id, integration_project_id)
    create_issue(integration, command)
  end

  def forward_to_issue(
        %ForwardToIssue{workspaceId: workspace_id, integrationProjectId: integration_project_id} =
          command
      ) do
    integration = Repo.Integration.get_by_project_id(workspace_id, integration_project_id)
    forward_to_issue(integration, command)
  end

  def label_issue(
        %LabelIssue{workspaceId: workspace_id, integrationProjectId: integration_project_id} =
          command
      ) do
    integration = Repo.Integration.get_by_project_id(workspace_id, integration_project_id)
    label_issue(integration, command)
  end

  def publish_recently_tagged_rooms(integration, issue_tag) do
    recently_tagged_rooms =
      from(
        r in Data.Room,
        join: w in assoc(r, :workspace),
        left_join: rt in assoc(r, :tags),
        left_join: t in assoc(rt, :tag),
        where: r.inserted_at > ago(10, "minute"),
        where: w.id == ^integration.workspace_id,
        where: rt.tag_id == ^issue_tag.id
      )
      |> Repo.all()

    recently_tagged_rooms
    |> Enum.each(fn r ->
      :ok = Api.Event.publish(r)
    end)

    :ok
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "gitlab"} = integration,
         %{title: title} = cmd
       ) do
    access_token = integration.specifics["access_token"]
    body = issue_body(cmd, to_parsed: false)

    Integration.GitLab.create_issue(
      access_token,
      integration.project_id,
      title,
      body
    )
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "linear"} = integration,
         %{title: title} = cmd
       ) do
    api_key = integration.specifics["api_key"]
    team_id = integration.specifics["team_id"]
    body = issue_body(cmd, to_parsed: false)
    label_id = integration.specifics["fogbender_label_id"]

    Integration.Linear.create_issue(
      api_key,
      team_id,
      title,
      label_id,
      body
    )
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "github"} = integration,
         %{title: title} = cmd
       ) do
    repo = integration.specifics["repo"]
    installation_id = integration.specifics["installation_id"]
    {:ok, api_key} = Integration.GitHub.installation_to_token(installation_id)
    body = issue_body(cmd, to_parsed: false)

    Integration.GitHub.create_issue(
      api_key,
      repo,
      title,
      body
    )
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "asana"} = integration,
         %{title: title} = cmd
       ) do
    project_id = integration.specifics["project_id"]
    api_key = integration.specifics["api_key"]
    body = issue_body(cmd)
    tag_id = integration.specifics["fogbender_tag_id"]

    Integration.Asana.create_task(
      api_key,
      project_id,
      title,
      tag_id,
      body
    )
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "jira"} = integration,
         %{title: title} = cmd
       ) do
    jira_url = integration.specifics["jira_url"]
    jira_user = integration.specifics["jira_user"]
    token = integration.specifics["token"]
    project_id = integration.project_id
    body = issue_body(cmd, to_parsed: false)

    Integration.Jira.create_issue(
      jira_url,
      jira_user,
      token,
      project_id,
      title,
      body
    )
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "height"} = integration,
         %{title: title} = cmd
       ) do
    user_token = integration.specifics["user_token"]
    fogbender_list_id = integration.specifics["fogbender_list_id"]
    body = issue_body(cmd, to_parsed: false)

    {:ok, body, maybe_user_token} =
      Integration.Height.create_task(
        user_token,
        fogbender_list_id,
        title,
        body
      )

    store_user_token_if_needed(integration, maybe_user_token)
    {:ok, body}
  end

  defp create_issue(
         %Data.WorkspaceIntegration{type: "trello"} = integration,
         %{title: title} = cmd
       ) do
    token = integration.specifics["token"]
    id_board = integration.project_id
    body = issue_body(cmd, to_parsed: false)

    Integration.Trello.create_card(
      token,
      id_board,
      title,
      body
    )
  end

  # forward
  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "gitlab"} = integration,
         %ForwardToIssue{issueId: iid} = cmd
       ) do
    access_token = integration.specifics["access_token"]
    body = issue_body(cmd)

    Integration.GitLab.create_note(
      access_token,
      integration.project_id,
      iid,
      body
    )
  end

  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "linear"} = integration,
         %ForwardToIssue{issueId: issue_id} = cmd
       ) do
    api_key = integration.specifics["api_key"]
    body = issue_body(cmd)

    Integration.Linear.create_comment(
      api_key,
      issue_id,
      body
    )
  end

  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "github"} = integration,
         %ForwardToIssue{issueId: issue_number} = cmd
       ) do
    installation_id = integration.specifics["installation_id"]
    {:ok, api_key} = Integration.GitHub.installation_to_token(installation_id)
    repo = integration.specifics["repo"]
    body = issue_body(cmd)

    Integration.GitHub.create_comment(
      api_key,
      repo,
      issue_number,
      body
    )
  end

  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "asana"} = integration,
         %ForwardToIssue{issueId: task_id} = cmd
       ) do
    api_key = integration.specifics["api_key"]
    body = issue_body(cmd)

    Integration.Asana.create_comment(
      api_key,
      task_id,
      body
    )
  end

  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "jira"} = integration,
         %ForwardToIssue{issueId: issue_id} = cmd
       ) do
    jira_url = integration.specifics["jira_url"]
    jira_user = integration.specifics["jira_user"]
    token = integration.specifics["token"]
    body = issue_body(cmd, to_parsed: false)

    Integration.Jira.create_comment(token, jira_url, jira_user, issue_id, body)
  end

  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "height"} = integration,
         %ForwardToIssue{issueId: issue_id} = cmd
       ) do
    user_token = integration.specifics["user_token"]
    body = issue_body(cmd, to_parsed: false)

    {:ok, body, maybe_user_token} = Integration.Height.create_comment(user_token, issue_id, body)
    store_user_token_if_needed(integration, maybe_user_token)
    {:ok, body}
  end

  defp forward_to_issue(
         %Data.WorkspaceIntegration{type: "trello"} = integration,
         %ForwardToIssue{issueId: issue_id} = cmd
       ) do
    token = integration.specifics["token"]
    body = issue_body(cmd, to_parsed: false)

    Integration.Trello.create_comment(token, issue_id, body)
  end

  # /forward

  # label
  defp label_issue(
         %Data.WorkspaceIntegration{type: "gitlab"} = integration,
         %LabelIssue{issueId: iid} = _cmd
       ) do
    access_token = integration.specifics["access_token"]

    Integration.GitLab.add_labels_to_issue(
      access_token,
      integration.project_id,
      iid
    )
  end

  defp label_issue(
         %Data.WorkspaceIntegration{type: "github"} = integration,
         %LabelIssue{issueId: issue_number} = _cmd
       ) do
    installation_id = integration.specifics["installation_id"]
    {:ok, api_key} = Integration.GitHub.installation_to_token(installation_id)
    repo = integration.specifics["repo"]

    Integration.GitHub.add_labels_to_issue(
      api_key,
      repo,
      issue_number
    )
  end

  defp label_issue(
         %Data.WorkspaceIntegration{type: "height"} = integration,
         %LabelIssue{issueId: issue_id} = _cmd
       ) do
    user_token = integration.specifics["user_token"]
    list_id = integration.specifics["fogbender_list_id"]

    Integration.Height.add_task_to_list(user_token, issue_id, list_id)
  end

  defp label_issue(
         %Data.WorkspaceIntegration{type: "jira"} = integration,
         %LabelIssue{issueId: issue_id} = _cmd
       ) do
    jira_url = integration.specifics["jira_url"]
    jira_user = integration.specifics["jira_user"]
    token = integration.specifics["token"]

    :ok = Integration.Jira.add_labels_to_issue(jira_url, jira_user, token, issue_id)

    {:ok, :ok}
  end

  defp label_issue(
         %Data.WorkspaceIntegration{type: "linear"} = integration,
         %LabelIssue{issueId: issue_id} = _cmd
       ) do
    %{module: module} = info("linear")
    token = module.token(integration)
    label_id = integration.specifics["fogbender_label_id"]

    Integration.Linear.add_labels_to_issue(
      token,
      issue_id,
      [label_id]
    )
  end

  # TODO
  _x = """
    defp label_issue(
           %Data.WorkspaceIntegration{type: "asana"} = integration,
           %LabelIssue{issueId: task_id} = cmd
         ) do
      api_key = integration.specifics["api_key"]
      body = issue_body(cmd)

      Integration.Asana.create_comment(
        api_key,
        task_id,
        body
      )
    end

    defp label_issue(
           %Data.WorkspaceIntegration{type: "trello"} = integration,
           %LabelIssue{issueId: issue_id} = cmd
         ) do
      token = integration.specifics["token"]
      body = issue_body(cmd, to_parsed: false)

      Integration.Trello.create_comment(token, issue_id, body)
    end
  """

  # /label

  defp issue_body(cmd), do: issue_body(cmd, nil)

  defp issue_body(
         %ForwardToIssue{
           linkRoomId: link_room_id,
           linkStartMessageId: link_start_message_id,
           linkEndMessageId: link_end_message
         },
         opts
       ) do
    issue_body(link_room_id, link_start_message_id, link_end_message, opts)
  end

  defp issue_body(
         %CreateIssueWithForward{
           linkRoomId: link_room_id,
           linkStartMessageId: link_start_message_id,
           linkEndMessageId: link_end_message
         } = cmd,
         opts
       ) do
    case cmd |> Map.get(:body) do
      nil ->
        issue_body(link_room_id, link_start_message_id, link_end_message, opts)

      body ->
        body
    end
  end

  defp issue_body(%CreateIssue{roomId: _room_id, body: body}, _opts) when not is_nil(body),
    do: body

  defp issue_body(%CreateIssue{roomId: room_id}, _opts) do
    room = Repo.Room.get(room_id) |> Repo.preload([:vendor, :workspace, :customer])
    room_url = Utils.room_url(room.vendor.id, room.workspace.id, room.id)

    "New issue from **[#{Repo.Helpdesk.printable_customer_name(room.customer.name)}](#{room_url})**"
  end

  defp issue_body(link_room_id, link_start_message_id, link_end_message, opts) do
    room =
      from(
        r in Data.Room,
        where: r.id == ^link_room_id,
        preload: [:customer, :vendor, :workspace]
      )
      |> Repo.one!()

    messages =
      from(
        m in Data.Message,
        where:
          m.room_id == ^link_room_id and m.id >= ^link_start_message_id and
            m.id <= ^link_end_message and is_nil(m.deleted_at),
        preload: [:from_agent, :from_user, :files]
      )
      |> Repo.all()

    url = Utils.message_url(room.vendor.id, room.workspace.id, room.id, link_start_message_id)

    text =
      "New issue from **[#{Repo.Helpdesk.printable_customer_name(room.customer.name)}](#{url})**\n\n"

    body(messages, text, opts)
  end

  defp body([], text, _opts) do
    text
  end

  defp body([h | t], text, opts) do
    _dt =
      h.inserted_at
      |> DateTime.truncate(:second)
      |> DateTime.to_string()

    text =
      text <>
        """
        \n\n
        **[#{author_name(h)}](mailto:#{author_email(h)})**:\n#{to_parsed(h.text, opts)}
        """

    files =
      h.files
      |> Enum.map(fn f ->
        if f.data["type"] == "attachment:image" do
          "Image upload"
        else
          "File upload"
        end
      end)
      |> Enum.join("")

    text = text <> files

    body(t, text, opts)
  end

  defp author_name(%Data.Message{from_agent: agent}) when not is_nil(agent) do
    agent.name
  end

  defp author_name(%Data.Message{from_user: user}) when not is_nil(user) do
    "#{user.name} (Customer)"
  end

  defp author_email(%Data.Message{from_agent: agent}) when not is_nil(agent) do
    agent.email
  end

  defp author_email(%Data.Message{from_user: user}) when not is_nil(user) do
    user.email
  end

  defp to_parsed(text, to_parsed: false), do: text

  defp to_parsed(text, _opts) do
    r = Regex.replace(~r/[\n]{2,}/, text, "\n\n")

    r =
      Regex.split(~r/[\n]{2}/, r)
      # |> Enum.map(&"<p>#{HtmlEntities.encode(&1)}</p>")
      |> Enum.map(&"\n  #{&1}\n")
      |> Enum.join("")

    Regex.replace(~r/\n/, r, "<br/>")
  end

  def store_user_token_if_needed(integration, nil) do
    integration
  end

  def store_user_token_if_needed(integration, user_token) do
    specifics =
      integration.specifics
      |> Map.put("user_token", user_token)

    %Data.WorkspaceIntegration{} =
      Data.WorkspaceIntegration.update(integration, specifics: specifics) |> Repo.update!()
  end

  def with_commands(%Data.Room{agent_id: agent_id} = room, integrations)
      when not is_nil(agent_id) do
    agent = Repo.Agent.get(agent_id)

    if agent.is_bot do
      agent = agent |> Repo.preload(tags: :tag)

      ai_integration = integrations |> Enum.find(&(info(&1.type).meta_type === "ai"))

      issue_tracker_commands =
        if ai_integration do
          tag_name = Ai.integration_tag_name(ai_integration)

          if agent.tags |> Enum.find(&(&1.tag.name === tag_name)) do
            integrations
            |> Enum.filter(&(info(&1.type).meta_type === "issue_tracker"))
            |> Enum.map(fn i ->
              file_issue_command(i)
            end)
          else
            []
          end
        else
          []
        end

      commands =
        integrations
        |> Enum.find_value(fn integration ->
          module = @info[integration.type].module

          if module do
            tag_name = module.integration_tag_name(integration)

            if tag_name do
              if agent.tags |> Enum.find(&(&1.tag.name === tag_name)) do
                module.commands(integration)
              end
            end
          end
        end) || []

      commands =
        (issue_tracker_commands ++ commands)
        |> Enum.reject(fn c -> is_nil(c) end)
        |> Enum.uniq()

      %{room | commands: commands}
    else
      room
    end
  end

  def with_commands(room, _), do: room
end
