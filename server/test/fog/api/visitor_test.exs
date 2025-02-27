defmodule Fog.Api.VisitorTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  alias Fog.{Api, ApiProcess}

  setup do
    vendor = vendor()

    workspace =
      workspace(vendor)
      |> Data.Workspace.update(
        visitor_key: Fog.UserSignature.generate_192bit_secret(),
        visitors_enabled: true
      )
      |> Repo.update!()

    api = ApiProcess.start()
    {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)

    Kernel.binding()
  end

  test "VerifyEmail is rate limited per email", ctx do
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
    assert %Api.Auth.Ok{} = ApiProcess.request(ctx.api, req)

    req = %Api.Visitor.VerifyEmail{email: "test@example.com"}
    assert %Api.Visitor.Ok{} = ApiProcess.request(ctx.api, req)
    assert %Api.Visitor.Err{code: 429} = ApiProcess.request(ctx.api, req)
  end

  test "VerifyCode allows 3 attemtps", ctx do
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
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
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
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

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
    assert %Api.Auth.Ok{} = ApiProcess.request(ctx.api, req)

    items = ApiProcess.flush(agent_api) |> Enum.sort_by(fn %struct{} -> struct end)

    assert [
             # returned by api/event
             %Api.Event.Room{} = r0,
             # also returned handled api/roster
             %Api.Event.Room{} = r1,
             %Api.Event.RosterRoom{},
             %Api.Event.RosterSection{name: "NEW VISITOR"}
           ] = items

    assert %{r0 | msgId: nil} == %{r1 | msgId: nil}
  end

  test "Verification should work even if user is already a room member", ctx do
    api = ctx.api
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
    assert %Api.Auth.Ok{visitorToken: token} = ApiProcess.request(api, req)

    req = %Api.Visitor.VerifyEmail{email: "test20@example.com"}
    assert %Api.Visitor.Ok{} = ApiProcess.request(api, req)

    req = %Api.Visitor.VerifyCode{emailCode: ApiProcess.session(api).verification_code}
    assert %Api.Visitor.Ok{userId: user_id} = ApiProcess.request(api, req)

    # avoid verification request limit
    Repo.User.get(user_id)
    |> Data.User.update(email: "test21@example.com")
    |> Repo.update!()

    api = ApiProcess.start()

    req = %Api.Auth.Visitor{
      widgetId: ctx.widget_id,
      visitorKey: ctx.workspace.visitor_key,
      token: token
    }

    assert %Api.Auth.Ok{} = ApiProcess.request(api, req)

    req = %Api.Visitor.VerifyEmail{email: "test23@example.com"}
    assert %Api.Visitor.Ok{} = ApiProcess.request(api, req)

    req = %Api.Visitor.VerifyCode{emailCode: ApiProcess.session(api).verification_code}
    assert %Api.Visitor.Ok{} = ApiProcess.request(api, req)
  end

  test "New returns error if visitor is not enabled", ctx do
    Data.Workspace.update(ctx.workspace, visitors_enabled: false)
    |> Repo.update!()

    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
    assert %Api.Auth.Err{} = ApiProcess.request(ctx.api, req)
  end

  test "New returns error if visitor key is invalid", ctx do
    req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: "FAKE"}
    assert %Api.Auth.Err{} = ApiProcess.request(ctx.api, req)
  end

  describe "NEW VISITOR roster section" do
    setup ctx do
      agent = agent(ctx.workspace)
      agent_api = ApiProcess.start(agent)
      req = %Api.Auth.Visitor{widgetId: ctx.widget_id, visitorKey: ctx.workspace.visitor_key}
      assert %Api.Auth.Ok{userId: user_id} = ApiProcess.request(ctx.api, req)

      api2 = ApiProcess.start()
      assert %Api.Auth.Ok{} = ApiProcess.request(api2, req)

      [vr_old, vr_new] = Repo.all(Data.Room)
      ts = DateTime.add(DateTime.utc_now(), -1, :hour)

      from(r in Data.Room, where: r.id == ^vr_old.id)
      |> Repo.update_all(set: [inserted_at: ts])

      Kernel.binding()
    end

    test "shows only 30min old new visitor rooms by default", ctx do
      vr_new_id = ctx.vr_new.id
      req = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(ctx.agent_api, req)

      items = items |> Enum.sort_by(fn %struct{} -> struct end)

      assert [
               %Api.Event.RosterRoom{roomId: ^vr_new_id},
               %Api.Event.RosterSection{name: "NEW VISITOR", count: 1}
             ] = items
    end

    test "shows all rooms when maxNewVisitorAge filter is 0", ctx do
      req = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, req)

      req = %Api.Roster.OpenView{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "test",
        sections: ["NEW VISITOR"],
        filters: %{"maxNewVisitorAge" => 0}
      }

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, req)
      items = items |> Enum.sort_by(fn %struct{} -> struct end)

      assert [
               %Api.Event.RosterRoom{},
               %Api.Event.RosterRoom{},
               %Api.Event.RosterSection{name: "NEW VISITOR", count: 2}
             ] = items
    end

    test "shows newer than maxNewVisitorAge visitors rooms", ctx do
      req = %Api.Roster.Sub{topic: "workspace/#{ctx.workspace.id}/roster"}
      assert %Api.Roster.SubOk{} = ApiProcess.request(ctx.agent_api, req)

      req = %Api.Roster.OpenView{
        topic: "workspace/#{ctx.workspace.id}/roster",
        view: "test",
        sections: ["NEW VISITOR"],
        filters: %{"maxNewVisitorAge" => 10}
      }

      assert %Api.Roster.OpenViewOk{items: items} = ApiProcess.request(ctx.agent_api, req)
      items = items |> Enum.sort_by(fn %struct{} -> struct end)

      assert [
               %Api.Event.RosterRoom{},
               %Api.Event.RosterSection{name: "NEW VISITOR", count: 1}
             ] = items
    end

    test "user session ignores maxNewVisitorAge filter", ctx do
      user = Repo.get(Data.User, ctx.user_id)
      user_api = ApiProcess.start(user)

      req = %Api.Roster.Sub{topic: "helpdesk/#{user.helpdesk_id}/roster"}
      assert %Api.Roster.SubOk{items: items} = ApiProcess.request(user_api, req)
      items = items |> Enum.sort_by(fn %struct{} -> struct end)

      assert [
               %Api.Event.RosterRoom{},
               %Api.Event.RosterSection{name: "PRIVATE", count: 1}
             ] = items
    end
  end
end
