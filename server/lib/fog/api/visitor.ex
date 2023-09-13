defmodule Fog.Api.Visitor do
  use Fog.Api.Handler

  alias Fog.{Data, Repo, Mailer}
  alias Fog.Api.{Event, Session}
  require Logger

  defmsg(New, [:widgetId, :visitorKey, :localTimestamp])
  defmsg(VerifyEmail, [:email])
  defmsg(VerifyCode, [:emailCode])

  defmsg(Ok, [:userId, :token])
  deferr(Err)

  @verify_delay 30000
  @verify_attempts 3

  def info(%New{widgetId: widget_id} = auth, %Session.Guest{} = session) do
    with {:ok, %Data.Workspace{visitors_enabled: true} = workspace} <-
           Repo.Workspace.from_widget_id(widget_id),
         true <- workspace.visitor_key == auth.visitorKey do
      provision_visitor(workspace, auth, session)
    else
      _ -> {:reply, Err.not_authorized()}
    end
  end

  def info(
        %VerifyEmail{email: email},
        %Session.User{
          userId: user_id,
          is_visitor: true,
          email_verified: false
        } = sess
      ) do
    is_rate_limited = Fog.Limiter.put({__MODULE__, email}, @verify_delay) != :ok
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
          from: Mailer.source("#{vendor_name} Support"),
          subject: subject,
          text_body: text
        )
        |> Mailer.send()

        {:reply, %Ok{},
         %{
           reset_code(sess)
           | verification_code: "#{verification_code}",
             verification_email: email
         }}

      {true, _} ->
        {:reply, Err.rate_limited()}

      {_, _} ->
        {:reply, Err.invalid_request()}
    end
  end

  def info(
        %VerifyCode{emailCode: code},
        %Session.User{
          vendorId: vendor_id,
          helpdeskId: helpdesk_id,
          userId: old_user_id,
          is_visitor: true,
          email_verified: false,
          verification_code: code,
          verification_email: email
        } = s
      ) do
    user_exid = email
    user_name = email

    user_picture = "https://api.dicebear.com/7.x/adventurer/svg?seed=#{Base.url_encode64(email)}"

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
      Event.Room.publish(r)
    end)

    {:reply, %Ok{userId: user.id, token: token}, reset_code(s)}
  end

  def info(%VerifyCode{}, %Session.User{verification_code: nil}) do
    {:reply, Err.forbidden()}
  end

  def info(%VerifyCode{}, %Session.User{verification_attempts: va} = s) do
    if va >= @verify_attempts do
      {:reply, Err.forbidden(), reset_code(s)}
    else
      {:reply, Err.not_found(), update_verify_attempts(s)}
    end
  end

  def info(%New{}, _), do: {:reply, Err.forbidden()}
  def info(%VerifyEmail{}, _), do: {:reply, Err.forbidden()}

  def info(_, _), do: :skip

  def is_visitor?(%Data.User{external_uid: "visitor-" <> _}), do: true
  def is_visitor?(%Data.User{}), do: false

  defp provision_visitor(
         workspace,
         %New{widgetId: widget_id, localTimestamp: localTimestamp},
         session
       ) do
    customer = Repo.Helpdesk.get_external(workspace.id).customer
    uexid = "visitor-#{Snowflake.next_id() |> elem(1)}"

    user_picture = "https://api.dicebear.com/7.x/adventurer/svg?seed=#{Base.url_encode64(uexid)}"

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
    display_name_for_agent = "#{user.name}"
    display_name_for_user = "Chat from #{localTimestamp}"

    room =
      %Data.Room{} =
      Repo.Room.create_private(workspace.id, [user.id], ["all"], %{
        helpdesk_id: user.helpdesk_id,
        name: room_name,
        display_name_for_user: display_name_for_user,
        display_name_for_agent: display_name_for_agent,
        tags: []
      })

    Event.publish(room)

    token =
      Fog.UserSignature.jwt_sign(
        %{widgetId: widget_id, userId: user.id, visitor: true},
        workspace.signature_secret
      )

    res = %Ok{userId: user.id, token: token}

    {:reply, res, session}
  end

  def email_verified?(%Data.User{email: email}), do: not String.match?(email, ~r/.*@example.com/)

  defp reset_code(%Session.User{} = s) do
    %Session.User{
      s
      | verification_email: nil,
        verification_code: nil,
        verification_attempts: 0
    }
  end

  defp update_verify_attempts(%Session.User{} = s) do
    %Session.User{
      s
      | verification_attempts: s.verification_attempts + 1
    }
  end
end
