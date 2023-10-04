defmodule Test.Api.AuthTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase
  alias Fog.Api

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    h = helpdesk(workspace, true)

    guest_api = Api.Session.guest() |> Api.init()
    {:ok, widget_id} = Repo.Workspace.to_widget_id(workspace.id)

    Kernel.binding()
  end

  test "Login from new customer should trigger new helpdesk/triage event", ctx do
    rpid = sub("workspace/#{ctx.workspace.id}/rooms")
    cpid = sub("workspace/#{ctx.workspace.id}/customers")

    request = auth_user_req(ctx.workspace, "CUST1", "USER1")

    assert {:reply, %Api.Auth.Ok{}, _} = Api.request(request, ctx.guest_api)

    assert_receive(
      {^rpid, _,
       %Api.Event.Room{
         name: "Triage"
       }},
      5000
    )

    assert_receive(
      {^cpid, _,
       %Api.Event.Customer{
         name: "CUST1 NAME",
         external_uid: "CUST1"
       }},
      5000
    )
  end

  test "Set last_activity_at to current ts on first user login", ctx do
    request = auth_user_req(ctx.workspace, "CUST1", "USER1")
    assert {:reply, %Api.Auth.Ok{}, _} = Api.request(request, ctx.guest_api)
    assert %Data.User{last_activity_at: la} = Repo.get_by(Data.User, external_uid: "USER1")
    assert not is_nil(la)
    assert {:reply, %Api.Auth.Ok{}, _} = Api.request(request, ctx.guest_api)
    assert %Data.User{last_activity_at: ^la} = Repo.get_by(Data.User, external_uid: "USER1")
  end

  test "User login shouldn't change room_tag.id for triage", ctx do
    request = auth_user_req(ctx.workspace, "CUST1", "USER1")
    assert {:reply, %Api.Auth.Ok{}, _} = Api.request(request, ctx.guest_api)
    t = Data.RoomTag |> Repo.one()
    assert {:reply, %Api.Auth.Ok{}, _} = Api.request(request, ctx.guest_api)
    assert t == Data.RoomTag |> Repo.one()
  end

  test "Login will crash if customerId is a number", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: 1,
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: 1},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if userId is a number", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: 1,
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: 1, customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if customerName is a number", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: 1,
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1", customerName: 1},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if userName is a number", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: 1,
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if userAvatarUrl is a number", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: 1,
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if userEmail is a number", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: 1
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if customerId is undefined", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: nil,
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: nil},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if customerName is undefined", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: nil,
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will return error if userId is undefined", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: nil,
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: nil, customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Auth.Err{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if userName is undefined", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: nil,
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will NOT crash if userAvatarUrl is undefined", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: nil,
      userEmail: "user1@example.com"
    }

    # server will generate a random avatar url instead
    assert {:reply,
            %Fog.Api.Auth.Ok{
              userAvatarUrl: "https://api.dicebear.com/7.x/pixel-art/" <> _
            }, _} = Api.request(request, ctx.guest_api)
  end

  test "Login will crash if userEmail is undefined", ctx do
    request = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: nil
    }

    assert {:reply, %Fog.Api.Error.Fatal{}, _} = Api.request(request, ctx.guest_api)
  end

  test "two users with the same email and different external uids CAN use widget", ctx do
    user1 = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER1",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER1", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    user2 = %Api.Auth.User{
      widgetId: ctx.widget_id,
      customerId: "CUST1",
      customerName: "NEW CUST",
      userId: "USER2",
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: "USER2", customerId: "CUST1"},
          ctx.workspace.signature_secret
        ),
      userName: "NEW USER",
      userAvatarUrl: "",
      userEmail: "user1@example.com"
    }

    ## user2 gets merged into user1 - we assume it's the same user
    assert {:reply, %Fog.Api.Auth.Ok{}, _} = Api.request(user1, ctx.guest_api)
    assert {:reply, %Fog.Api.Auth.Ok{}, _} = Api.request(user2, ctx.guest_api)
  end

  describe "visitors auth" do
    setup ctx do
      workspace =
        ctx.workspace
        |> Data.Workspace.update(
          visitor_key: Fog.UserSignature.generate_192bit_secret(),
          visitors_enabled: true
        )
        |> Repo.update!()

      [workspace: workspace]
    end

    test "login new visitor", ctx do
      auth = %Api.Auth.Visitor{
        widgetId: ctx.widget_id,
        visitorKey: ctx.workspace.visitor_key,
        localTimestamp: "XYZ"
      }

      assert {:reply, %Fog.Api.Auth.Ok{visitorToken: token, userId: user_id}, _} =
               Api.request(auth, ctx.guest_api)

      s2 = Api.init(Api.Session.guest())
      auth = %Api.Auth.Visitor{widgetId: ctx.widget_id, token: token}
      assert {:reply, %Fog.Api.Auth.Ok{userId: ^user_id}, _} = Api.request(auth, s2)
    end
  end

  defp auth_user_req(ws, ex_cid, ex_uid) do
    {:ok, widget_id} = Repo.Workspace.to_widget_id(ws.id)

    %Api.Auth.User{
      widgetId: widget_id,
      customerId: ex_cid,
      customerName: "#{ex_cid} NAME",
      userId: ex_uid,
      userJWT:
        Fog.UserSignature.jwt_sign(
          %{userId: ex_uid, customerId: ex_cid},
          ws.signature_secret
        ),
      userName: "#{ex_uid} NAME",
      userAvatarUrl: "",
      userEmail: "#{ex_uid}@example.com"
    }
  end
end
