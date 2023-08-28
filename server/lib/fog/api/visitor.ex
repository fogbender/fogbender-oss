defmodule Fog.Api.Visitor do
  use Fog.Api.Handler

  alias Fog.{Data, Repo, Mailer}
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

    user_picture =
      "https://api.dicebear.com/7.x/adventurer/svg?seed=#{Base.url_encode64(uexid)}"

    user_name = "#{Fog.Names.name()} from #{Fog.Names.place()}"
    user_email = "#{uexid}@example.com"

    user =
      Repo.User.import_external(
        workspace.vendor_id,
        workspace.id,
        customer.external_uid,
        uexid,
        {user_email, user_name, user_picture, customer.name},
        false
      )

    user = Repo.User.update(user.id, is_visitor: true, email_verified: false)

    room_name = "#{user.name} [#{Fog.Types.UserId.dump(user.id) |> elem(1)}]"

    %Data.Room{} =
      Repo.Room.create_private(workspace.id, [user.id], ["all"], %{
        helpdesk_id: user.helpdesk_id,
        name: room_name,
        tags: []
      })

    token =
      Fog.UserSignature.jwt_sign(
        %{widgetId: widget_id, userId: user.id, visitor: true},
        workspace.signature_secret
      )

    res = %Ok{userId: user.id, token: token}

    {:reply, res, session}
  end

  def info(
        %VerifyEmail{email: email},
        %Session.User{
          userId: user_id,
          is_visitor: true,
          email_verified: false,
          verification_request_ts: verification_request_ts,
          verification_request_attempt: verification_request_attempt
        } = sess
      ) do
    is_rate_limited =
      case verification_request_ts do
        nil ->
          false

        dt ->
          DateTime.diff(DateTime.utc_now(), dt) < 5 * verification_request_attempt
      end

    is_email = String.match?(email, ~r/^[[:graph:]]+@[[:graph:]]+$/)

    case {is_rate_limited, is_email} do
      {false, true} ->
        user = Repo.User.get(user_id) |> Repo.preload(helpdesk: [:vendor])
        verification_code = :rand.uniform(9) * 100 + :rand.uniform(9) * 10 + :rand.uniform(9)
        vendor_name = user.helpdesk.vendor.name
        subject = "#{verification_code} is your #{vendor_name} support verification code"

        text =
          "Your #{vendor_name} support verification code is #{verification_code}. If you didn’t request to verify your email, please ignore this message."

        Bamboo.Email.new_email(
          to: email,
          from: Mailer.source(),
          subject: subject,
          text_body: text
        )
        |> Mailer.send()

        {:reply, %Ok{},
         %{
           sess
           | verification_code: "#{verification_code}",
             verification_request_ts: DateTime.utc_now(),
             verification_request_attempt: verification_request_attempt + 1,
             verification_email: email
         }}

      {true, _} ->
        {:reply, Err.rate_limited()}

      {_, _} ->
        {:reply, Err.invalid_request()}
    end
  end

  def info(%VerifyCode{emailCode: code}, %Session.User{
        vendorId: vendor_id,
        helpdeskId: helpdesk_id,
        userId: old_user_id,
        is_visitor: true,
        email_verified: false,
        verification_code: code,
        verification_email: email
      }) do
    user_exid = email
    user_name = email

    user_picture =
      "https://api.dicebear.com/7.x/adventurer/svg?seed=#{Base.url_encode64(email)}"

    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:customer, :workspace])

    user =
      Repo.User.import_external(
        vendor_id,
        helpdesk.workspace_id,
        helpdesk.customer.external_uid,
        user_exid,
        {email, user_name, user_picture, helpdesk.customer.name},
        false
      )

    {:ok, widget_id} = Repo.Workspace.to_widget_id(helpdesk.workspace_id)

    token =
      Fog.UserSignature.jwt_sign(
        %{widgetId: widget_id, userId: user.id, visitor: true},
        helpdesk.workspace.signature_secret
      )

    Repo.Room.for_user(old_user_id)
    |> Enum.each(fn r ->
      r = Repo.Room.update_members(r.id, [user.id], [])
      Fog.Api.Event.Room.publish(r)
    end)

    {:reply, %Ok{userId: user.id, token: token}}
  end

  def info(%New{}, _), do: {:reply, Err.forbidden()}
  def info(%VerifyEmail{}, _), do: {:reply, Err.forbidden()}
  def info(%VerifyCode{}, _), do: {:reply, Err.forbidden()}
  def info(_, _), do: :skip

  def is_visitor?(%Data.User{external_uid: "visitor-" <> _}), do: true
  def is_visitor?(%Data.User{}), do: false

  def email_verified?(%Data.User{email: email}), do: not String.match?(email, ~r/.*@example.com/)
end
