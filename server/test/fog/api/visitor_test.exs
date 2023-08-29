defmodule Fog.Api.VisitorTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  alias Fog.Api

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    h = helpdesk(workspace, true)

    api = Api.Session.guest() |> Api.init()
    {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)

    Kernel.binding()
  end

  test "VerifyEmail is rate limited per email", ctx do
    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert {:reply, %Api.Visitor.Ok{token: token}, api} = Api.request(req, ctx.api)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert {:reply, %Api.Auth.Ok{}, api} = Api.request(req, api)

    req = %Api.Visitor.VerifyEmail{email: "test@example.com"}
    assert {:reply, %Api.Visitor.Ok{}, api} = Api.request(req, api)
    assert {:reply, %Api.Visitor.Err{code: 429}, _} = Api.request(req, api)
  end

  test "VerifyCode allows 3 attemtps", ctx do
    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert {:reply, %Api.Visitor.Ok{token: token}, api} = Api.request(req, ctx.api)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert {:reply, %Api.Auth.Ok{}, api} = Api.request(req, api)

    req = %Api.Visitor.VerifyEmail{email: "test1@example.com"}
    assert {:reply, %Api.Visitor.Ok{}, api} = Api.request(req, api)

    req = %Api.Visitor.VerifyCode{emailCode: "xxx"}
    assert {:reply, %Api.Visitor.Err{code: 404}, api} = Api.request(req, api)
    assert {:reply, %Api.Visitor.Err{code: 404}, api} = Api.request(req, api)
    assert {:reply, %Api.Visitor.Err{code: 404}, api} = Api.request(req, api)
    assert {:reply, %Api.Visitor.Err{code: 403}, api} = Api.request(req, api)
    assert {:reply, %Api.Visitor.Err{code: 403}, _} = Api.request(req, api)
  end

  test "Verification", ctx do
    req = %Api.Visitor.New{widgetId: ctx.widget_id}
    assert {:reply, %Api.Visitor.Ok{token: token}, api} = Api.request(req, ctx.api)

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert {:reply, %Api.Auth.Ok{}, api} = Api.request(req, api)

    req = %Api.Visitor.VerifyEmail{email: "test2@example.com"}
    assert {:reply, %Api.Visitor.Ok{}, api} = Api.request(req, api)

    req = %Api.Visitor.VerifyCode{emailCode: api.session.verification_code}
    assert {:reply, %Api.Visitor.Ok{token: token}, _} = Api.request(req, api)

    api = Api.Session.guest() |> Api.init()
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
    assert {:reply, %Api.Auth.Ok{}, _} = Api.request(req, api)
  end
end
