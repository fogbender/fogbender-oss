defmodule Fog.Api.VisitorTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  alias Fog.{Api, ApiProcess}

  setup do
    vendor = vendor()
    workspace = workspace(vendor)

    api = ApiProcess.start()
    {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)

    Kernel.binding()
  end

  test "VerifyEmail is rate limited per email", ctx do
    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert %Api.Visitor.Ok{token: token} = ApiProcess.request(ctx.api, req)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert %Api.Auth.Ok{} = ApiProcess.request(ctx.api, req)

    req = %Api.Visitor.VerifyEmail{email: "test@example.com"}
    assert %Api.Visitor.Ok{} = ApiProcess.request(ctx.api, req)
    assert %Api.Visitor.Err{code: 429} = ApiProcess.request(ctx.api, req)
  end

  test "VerifyCode allows 3 attemtps", ctx do
    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert %Api.Visitor.Ok{token: token} = ApiProcess.request(ctx.api, req)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert %Api.Auth.Ok{} = ApiProcess.request(ctx.api, req)

    req = %Api.Visitor.VerifyEmail{email: "test1@example.com"}
    assert %Api.Visitor.Ok{} = ApiProcess.request(ctx.api, req)

    req = %Api.Visitor.VerifyCode{emailCode: "xxx"}
    assert %Api.Visitor.Err{code: 404} = ApiProcess.request(ctx.api, req)
    assert %Api.Visitor.Err{code: 404} = ApiProcess.request(ctx.api, req)
    assert %Api.Visitor.Err{code: 404} = ApiProcess.request(ctx.api, req)
    assert %Api.Visitor.Err{code: 403} = ApiProcess.request(ctx.api, req)
    assert %Api.Visitor.Err{code: 403} = ApiProcess.request(ctx.api, req)
  end

  test "Verification", ctx do
    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert %Api.Visitor.Ok{token: token} = ApiProcess.request(ctx.api, req)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert %Api.Auth.Ok{} = ApiProcess.request(ctx.api, req)

    req = %Api.Visitor.VerifyEmail{email: "test2@example.com"}
    assert %Api.Visitor.Ok{} = ApiProcess.request(ctx.api, req)

    req = %Api.Visitor.VerifyCode{emailCode: ApiProcess.session(ctx.api).verification_code}
    assert %Api.Visitor.Ok{token: token} = ApiProcess.request(ctx.api, req)

    api = ApiProcess.start()
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert %Api.Auth.Ok{} = ApiProcess.request(api, req)
  end

  test "New visitor's room showed in agent roster", ctx do
    agent = agent(ctx.workspace)
    agent_api = ApiProcess.start(agent)
    req = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
    assert %Api.Roster.SubOk{items: []} = ApiProcess.request(agent_api, req)

    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert %Api.Visitor.Ok{token: token} = ApiProcess.request(ctx.api, req)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert %Api.Auth.Ok{} = ApiProcess.request(ctx.api, req)

    items = ApiProcess.flush(agent_api) |> Enum.sort_by(fn %struct{} -> struct end)

    assert [
             %Api.Event.Room{},
             %Api.Event.RosterRoom{},
             %Api.Event.RosterSection{name: "NEW VISITOR"}
           ] = items
  end
end
