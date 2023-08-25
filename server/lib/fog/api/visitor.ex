defmodule Fog.Api.Visitor do
  use Fog.Api.Handler

  alias Fog.{Data, Repo}
  alias Fog.Api.{Session}
  require Logger

  defmsg(New, [:widgetId])
  defmsg(VerifyEmail, [:email])
  defmsg(VerifyCode, [:emailCode])

  defmsg(Ok, [:userId, :token])
  deferr(Err)

  def info(%New{widgetId: widget_id}, %Session.Guest{} = session) do
    {:ok, %Data.Workspace{} = workspace} = Repo.Workspace.from_widget_id(widget_id)
    customer = Repo.Helpdesk.get_external(workspace.id).customer
    uexid = "visitor-#{Snowflake.next_id() |> elem(1)}"
    user_picture = "https://api.dicebear.com/6.x/adventurer/svg?seed=#{Base.url_encode64(uexid)}.svg"
    user_name = "#{Fog.Names.name()} from #{Fog.Names.place()}"
    user_email = "#{uexid}@example.com"

    user = Repo.User.import_external(
      workspace.vendor_id,
      workspace.id,
      customer.external_uid,
      uexid,
      {user_email, user_name, user_picture, customer.name},
      false
    )

    room_name = "#{user.name} [#{Fog.Types.UserId.dump(user.id) |> elem(1)}]"
    %Data.Room{} = Repo.Room.create_private(workspace.id, [user.id], ["all"], %{
        helpdesk_id: user.helpdesk_id,
        name: room_name,
        tags: []
    })

    token = Fog.UserSignature.jwt_sign(
      %{widgetId: widget_id, userId: user.id, visitor: true},
      workspace.signature_secret
    )

    res = %Ok{userId: user.id, token: token}

    {:reply, res, session}
  end

end
