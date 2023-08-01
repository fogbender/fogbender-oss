defmodule Fog.Test.Integration.GitLab do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.{Data, Repo}
  alias Fog.Integration.GitLabHook

  @event_issue "test/fog/integration/gitlab_event_issue.json" |> File.read!() |> Jason.decode!()
  @event_note "test/fog/integration/gitlab_event_note_on_issue.json"
              |> File.read!()
              |> Jason.decode!()
  @project_id "14"
  @issue_title "TEST TITLE"
  @note_issue_title "TEST ISSUE"

  setup do
    v = vendor()
    w = workspace(v)
    ha = helpdesk(w, true)

    specifics = %{
      "project_id" => @project_id,
      "project_path" => "PATH",
      "project_name" => "NAME",
      "project_url" => "URL",
      "access_token" => "TOKEN",
      "gitlab_url" => "GITLAB URL"
    }

    {:ok, widget_id} = Repo.Workspace.to_widget_id(w.id)
    assert {:ok, gitlab, gitlab_bot} = Repo.Integration.add(w, "gitlab", @project_id, specifics)
    assert gitlab_bot.is_bot == true
    Kernel.binding()
  end

  test "process new issue hook data", ctx do
    :ok = GitLabHook.run(%GitLabHook{widget_id: ctx.widget_id, data: @event_issue})

    assert r =
             %Data.Room{} = Repo.get_by(Data.Room, name: @issue_title) |> Repo.preload(:messages)

    assert [%Data.Message{}] = r.messages
  end

  test "process new note issue hook data", ctx do
    :ok = GitLabHook.run(%GitLabHook{widget_id: ctx.widget_id, data: @event_note})

    assert r =
             %Data.Room{} =
             Repo.get_by(Data.Room, name: @note_issue_title) |> Repo.preload(:messages)

    assert [%Data.Message{}] = r.messages
  end
end
