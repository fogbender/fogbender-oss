defmodule Test.Api.IntegrationTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.Api

  setup do
    v = vendor()
    w = workspace(v)
    a = agent(w)

    agent_api = Api.Session.for_agent(v.id, a.id) |> Api.init()

    ha = helpdesk(w, true)
    r = public_room(ha)
    m1 = message(r, a, "M1")
    m2 = message(r, a, "M2")

    gitlab =
      integration(w, "gitlab", "16012183", %{"project_id" => "16012183", "access_token" => "TEST"})

    github = integration(w, "github", "GITHUB", %{"repository_id" => 179_736_319})

    linear =
      integration(w, "linear", "LINEAR", %{"team_id" => "4a3ed6df-06bb-444d-b070-c19c0f1291b6"})

    asana =
      integration(w, "asana", "ASANA", %{
        "fogbender_tag_id" => "1202013749168090",
        "api_key" => "TEST"
      })

    jira = integration(w, "jira", "AT0", %{"jira_url" => "https://jira.com"})

    height =
      integration(w, "height", "HEIGHT", %{
        "fogbender_list_id" => "16e8d575-2588-4364-903c-9d072620287c",
        "workspace_name" => "HEIGHT_TEST",
        "workspace_url" => "https:/height.com/test"
      })

    trello =
      integration(w, "trello", "634077fb7479b8006b36a5e9", %{
        "token" => "testtoken",
        "board_id" => "634077fb7479b8006b36a5e9",
        "board_url" => "https://trello.com/b/PdqCJvzY/design",
        "board_name" => "DESIGN",
        "webhook_id" => "testhook"
      })

    gitlab_bypass = Bypass.open()
    Application.put_env(:fog, :gitlab_host, "http://localhost:#{gitlab_bypass.port}")

    Kernel.binding()
  end

  test "create issue in gitlab", ctx do
    request = %Api.Integration.CreateIssueWithForward{
      workspaceId: ctx.w.id,
      integrationProjectId: ctx.gitlab.project_id,
      title: "TEST",
      linkRoomId: ctx.r.id,
      linkStartMessageId: ctx.m1.id,
      linkEndMessageId: ctx.m2.id
    }

    Bypass.expect(ctx.gitlab_bypass, fn conn ->
      conn = Plug.Conn.put_resp_header(conn, "content-type", "application/json")
      Plug.Conn.resp(conn, 201, ~s(
        {
          "iid": "647",
          "labels": [],
          "state": "ISSUE_STATE",
          "title": "ISSUE_TITLE",
          "webUrl": "ISSUE_URL"
        }
      ))
    end)

    assert {:reply, %Api.Integration.Ok{}, _} = Api.request(request, ctx.agent_api)
  end

  test "create issue in linear" do
    :ok
  end

  describe "tags meta loading" do
    test "gitlab", ctx do
      load_log(:gitlab, ctx)

      workspace_id = ctx.w.id

      assert [
               {"Failed/retry appears on successful upload", ":gitlab:16012183:647",
                %{
                  meta_entity_id: "647",
                  meta_entity_name: "Failed/retry appears on successful upload",
                  meta_entity_type: "gitlab",
                  meta_entity_url: "https://gitlab.com/fogbender/fogbender/-/issues/647",
                  meta_type: "issue",
                  workspace_id: ^workspace_id
                }},
               {"Failed/retry appears on successful upload", ":gitlab:16012183:647:admin", _}
             ] = load_rooms_tags(ctx)
    end

    test "github", ctx do
      load_log(:github, ctx)

      assert [
               {"Fogbender test GITHUB", ":github:GITHUB:31",
                %{
                  meta_entity_id: "31",
                  meta_entity_name: "Fogbender test GITHUB",
                  meta_entity_type: "github",
                  meta_entity_url: "https://github.com/KunuTOK/KunuTOK.github.io/issues/31",
                  meta_type: "issue"
                }},
               {"Fogbender test GITHUB", ":github:GITHUB:31:admin", _},
               {"Fogbender test GITHUB", ":status:open", _}
             ] = load_rooms_tags(ctx)
    end

    test "linear", ctx do
      load_log(:linear, ctx)

      assert [
               {"Track signup referrals", ":linear:LINEAR",
                %{meta_entity_type: "linear", meta_type: "issue_tracker", name: ":linear:LINEAR"}},
               {"Track signup referrals", ":linear:LINEAR:573",
                %{
                  meta_entity_id: "573",
                  meta_entity_name: "Track signup referrals",
                  meta_entity_type: "linear",
                  meta_entity_url:
                    "https://linear.app/jumpwire/issue/JW-573/track-signup-referrals",
                  meta_type: "issue",
                  name: ":linear:LINEAR:573"
                }},
               {"Track signup referrals", ":linear:LINEAR:573:admin", _},
               {"Track signup referrals", ":status:open", _}
             ] = load_rooms_tags(ctx)
    end

    test "asana", ctx do
      load_log(:asana, ctx)

      assert [
               {"usage graph missing", ":asana:ASANA",
                %{meta_entity_type: "asana", meta_type: "issue_tracker"}},
               {"usage graph missing", ":asana:ASANA:1202178119666088",
                %{
                  meta_entity_id: "1202178119666088",
                  meta_entity_name: "usage graph missing",
                  meta_entity_type: "asana",
                  meta_entity_url: "https://app.asana.com/0/1202110424646494/1202178119666088",
                  meta_type: "issue"
                }},
               {"usage graph missing", ":asana:ASANA:1202178119666088:admin", _},
               {"usage graph missing", ":status:open", _}
             ] = load_rooms_tags(ctx)
    end

    test "jira", ctx do
      load_log(:jira, ctx)

      workspace_id = ctx.w.id

      assert [
               {"add a way to mark companies as acquired", ":jira:AT0:AT0-40",
                %{
                  meta_entity_id: "AT0-40",
                  meta_entity_name: "add a way to mark companies as acquired",
                  meta_entity_parent_id: "AT0",
                  meta_entity_type: "jira",
                  meta_entity_url: "https://jira.com/browse/AT0-40",
                  meta_state: "open",
                  meta_type: "issue",
                  workspace_id: ^workspace_id
                }},
               {"add a way to mark companies as acquired", ":jira:AT0:AT0-40:admin", _},
               {"add a way to mark companies as acquired", ":status:open", _}
             ] = load_rooms_tags(ctx)
    end

    test "height", ctx do
      load_log(:height, ctx)

      assert [
               {"Fogbender test HEIGHT", ":height:HEIGHT:137",
                %{
                  meta_entity_id: "137",
                  meta_entity_name: "Fogbender test HEIGHT",
                  meta_entity_type: "height",
                  meta_entity_url: "https://height.app/LJr2OAst7-/T-273",
                  meta_type: "issue"
                }},
               {"Fogbender test HEIGHT", ":height:HEIGHT:137:admin", _},
               {"Fogbender test HEIGHT", ":status:open", _}
             ] = load_rooms_tags(ctx)
    end

    test "trello", ctx do
      load_log(:trello, ctx)

      assert [
               {"TRELLO ISSUE 1", ":status:open", _},
               {"TRELLO ISSUE 1", ":trello:634077fb7479b8006b36a5e9",
                %{
                  meta_entity_name: "DESIGN",
                  meta_entity_type: "trello",
                  meta_entity_url: "https://trello.com/b/PdqCJvzY/design",
                  meta_type: "issue_tracker",
                  name: ":trello:634077fb7479b8006b36a5e9"
                }},
               {"TRELLO ISSUE 1", ":trello:634077fb7479b8006b36a5e9:3",
                %{
                  meta_entity_id: "3",
                  meta_entity_name: "TRELLO ISSUE 1",
                  meta_entity_type: "trello",
                  meta_entity_url: "https://trello.com/c/WKU8ZRPl",
                  meta_type: "issue",
                  name: ":trello:634077fb7479b8006b36a5e9:3"
                }},
               {"TRELLO ISSUE 1", ":trello:634077fb7479b8006b36a5e9:3:admin", _}
             ] = load_rooms_tags(ctx)
    end
  end

  test "loading issues from log (for migration)", ctx do
    for t <- [
          :gitlab,
          :github,
          :linear,
          :asana,
          :trello,
          :jira,
          :height
        ],
        do: load_log(t, ctx)

    Repo.delete_all(Data.IntegrationIssue)
    Fog.Issue.create_from_log()

    assert [
             %{type: "asana", issue_id: "1202178119666088"},
             %{type: "github", issue_id: "31"},
             %{type: "gitlab", issue_id: "647"},
             %{type: "height", issue_id: "137"},
             %{type: "jira", issue_id: "AT0-40"},
             %{type: "linear", issue_id: "573"},
             %{type: "trello", issue_id: "3"}
           ] = Repo.all(from(i in Data.IntegrationIssue, order_by: [i.type]))
  end

  defp load_rooms_tags(ctx) do
    req = %Api.Stream.Get{topic: "vendor/#{ctx.v.id}/rooms"}
    {_, %Api.Stream.GetOk{items: rooms}, _} = Api.request(req, ctx.agent_api)

    for %Api.Event.Room{tags: tags, name: name} <- rooms, tag <- tags do
      {name, tag.name, tag}
    end
    |> Enum.sort()
  end

  defp load_log(:gitlab, ctx) do
    data = load_json("test/support/data/integration_log/gitlab.json")
    assert :ok = integration_hook(ctx.gitlab, data)
  end

  defp load_log(:github, ctx) do
    data = load_json("test/support/data/integration_log/github.json")
    assert :ok = integration_hook(ctx.github, data)
  end

  defp load_log(:trello, ctx) do
    bypass = Bypass.open()
    Application.put_env(:fog, :trello_host, "http://localhost:#{bypass.port}")

    Bypass.expect(bypass, fn conn ->
      conn
      |> Plug.Conn.put_resp_content_type("application/json")
      |> Plug.Conn.resp(
        200,
        File.read!("test/support/data/integration_log/trello_task.json")
      )
    end)

    data = load_json("test/support/data/integration_log/trello.json")
    assert :ok = integration_hook(ctx.trello, data)
  end

  defp load_log(:height, ctx) do
    data = load_json("test/support/data/integration_log/height.json")
    assert :ok = integration_hook(ctx.height, data)
  end

  defp load_log(:jira, ctx) do
    data = load_json("test/support/data/integration_log/jira.json")
    assert :ok = integration_hook(ctx.jira, data)
  end

  defp load_log(:asana, ctx) do
    bypass = Bypass.open()
    Application.put_env(:fog, :asana_host, "http://localhost:#{bypass.port}")

    Bypass.expect(bypass, fn conn ->
      conn
      |> Plug.Conn.put_resp_content_type("application/json")
      |> Plug.Conn.resp(200, File.read!("test/support/data/integration_log/asana_task.json"))
    end)

    data = load_json("test/support/data/integration_log/asana_events.json")
    assert :ok = integration_hook(ctx.asana, data)
  end

  defp load_log(:linear, ctx) do
    data = load_json("test/support/data/integration_log/linear.json")
    assert :ok = integration_hook(ctx.linear, data)
  end

  defp integration_hook(%Data.WorkspaceIntegration{type: type} = i, data) do
    {:ok, widget_id} = Repo.Workspace.to_widget_id(i.workspace_id)

    module =
      case type do
        "gitlab" -> Fog.Integration.GitLabHook
        "github" -> Fog.Integration.GitHubHook
        "linear" -> Fog.Integration.LinearHook
        "asana" -> Fog.Integration.AsanaHook
        "jira" -> Fog.Integration.JiraHook
        "height" -> Fog.Integration.HeightHook
        "trello" -> Fog.Integration.TrelloHook
      end

    req = struct(module, widget_id: widget_id, data: data, height_workspace_id: i.project_id)
    module.run(req)
  end

  defp load_json(file),
    do: File.read!(file) |> Jason.decode!()
end
