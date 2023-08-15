defmodule Fog.Api.Auth do
  import Ecto.Query, only: [from: 2]

  use Fog.Api.Handler

  alias Fog.Api.{Session}
  alias Fog.{Repo, Data, Mailer}
  require Logger

  defmsg(User, [
    :widgetId,
    :widgetKey,
    :customerId,
    :customerName,
    :userId,
    :userHMAC,
    :userJWT,
    :userPaseto,
    :userToken,
    :userName,
    :userAvatarUrl,
    :userEmail
  ])

  defmsg(Agent, [:vendorId, :agentId, :token])

  defmsg(Unauthenticated, [:widgetId, :userId, :anonymousWidgetKey, :anonymousJWT])

  defmsg(Resume, [:vendorId, :sessionId, :token])
  defmsg(Logout, [:vendorId, :sessionId])

  defmsg(EmailToVerify, [:email])
  defmsg(CodeToVerify, [:verificationCode])

  defmsg(Ok, [
    :sessionId,
    :userId,
    :userAvatarUrl,
    :avatarLibraryUrl,
    :helpdesk,
    :helpdeskId,
    :customerName,
    :role,
    :userName,
    :userEmail,
    :widgetId
  ])

  defmsg(LogoutOk, [])
  deferr(Err)

  def login_user(%User{} = auth) do
    %User{
      widgetId: widget_id,
      widgetKey: widget_key,
      customerId: cexid,
      customerName: customer_name,
      userId: uexid,
      userHMAC: userHMAC,
      userJWT: userJWT,
      userPaseto: userPaseto,
      userToken: userToken,
      userName: user_name,
      userAvatarUrl: user_picture,
      userEmail: user_email
    } = auth

    workspace = Repo.Workspace.from_widget_id(widget_id)

    res =
      case workspace do
        {:ok,
         %Data.Workspace{
           id: wid,
           vendor_id: vid,
           signature_type: signature_type,
           signature_secret: signature_secret
         } = workspace} ->
          user_picture =
            case user_picture do
              nil ->
                {:default,
                 user_picture(Repo.FeatureOption.get(workspace).avatar_library_url, auth)}

              user_picture ->
                user_picture
            end

          signature_type =
            if userToken do
              "token"
            else
              signature_type
            end

          user_signature =
            case signature_type do
              "token" -> userToken
              "paseto" -> userPaseto
              "jwt" -> userJWT
              _ -> userHMAC
            end

          check_auth =
            case Fog.UserSignature.verify_user_signature(
                   user_signature,
                   auth,
                   signature_type,
                   signature_secret
                 ) do
              :ok ->
                :ok

              {:error, :signature_is_nil} ->
                case Fog.UserSignature.verify_widget_key(widget_key, signature_secret) do
                  :ok ->
                    :ok

                  error ->
                    Logger.error("widget key check failed", error: error)
                    error
                end

              error ->
                Logger.error("User signature failed", error: error)
                error
            end

          case check_auth do
            :ok ->
              with_triage =
                case cexid do
                  "$Cust_External_" <> _ ->
                    false

                  "$Cust_Anonymous_" <> _ ->
                    false

                  _ ->
                    true
                end

              user =
                Repo.User.import_external(
                  vid,
                  wid,
                  cexid,
                  uexid,
                  {user_email, user_name, user_picture, customer_name},
                  with_triage
                )

              user && {vid, user}

            _error ->
              nil
          end

        _ ->
          nil
      end

    case res do
      nil ->
        {:reply, Err.not_authorized()}

      {vid, user} ->
        session = Session.for_user(vid, user.helpdesk_id, user.id)

        user = user |> Repo.preload(helpdesk: [:tags, :customer, :vendor])

        unless user.last_activity_at,
          do: Repo.User.update_last_activity(user.id, DateTime.utc_now())

        {:ok, workspace} = workspace
        avatar_library_url = Repo.FeatureOption.get(workspace).avatar_library_url

        ok = %Ok{
          sessionId: session.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userAvatarUrl: user.image_url,
          customerName: user.helpdesk.customer.name,
          avatarLibraryUrl: avatar_library_url,
          helpdeskId: user.helpdesk_id,
          helpdesk: %{
            id: user.helpdesk_id,
            tags:
              user.helpdesk.tags
              |> Enum.map(
                &%{
                  id: &1.id,
                  name: &1.name
                }
              ),
            vendorName: user.helpdesk.vendor.name
          }
        }

        {:reply, ok, session}
    end
  end

  def info(%Unauthenticated{} = auth, %Session.Guest{}) do
    %Unauthenticated{
      widgetId: widget_id,
      userId: user_id
    } = auth

    {:ok, %Data.Workspace{id: wid, vendor_id: vid} = workspace} =
      Repo.Workspace.from_widget_id(widget_id)

    workspace = workspace |> Repo.preload([:vendor])

    user =
      if user_id do
        Repo.User.get(user_id)
      else
        uexid = "anonymous-#{Snowflake.next_id() |> elem(1)}"
        user_email = "#{uexid}@example.com"

        customer_name = "$Cust_Anonymous_#{wid}"

        user_picture =
          "https://api.dicebear.com/6.x/adventurer/svg?seed=#{Base.url_encode64(uexid)}.svg"

        user_name = "#{Fog.Names.name()} from #{Fog.Names.place()}"

        Repo.User.import_external(
          vid,
          wid,
          customer_name,
          uexid,
          {user_email, user_name, user_picture, customer_name},
          false
        )
      end

    user = user |> Repo.preload(helpdesk: [:tags, :customer, :vendor])

    session = Session.for_user(vid, user.helpdesk_id, user.id)

    avatar_library_url = Repo.FeatureOption.get(workspace).avatar_library_url

    {:ok, _room} = find_room(workspace, user)

    ok = %Ok{
      sessionId: session.id,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      customerName: user.helpdesk.customer.name,
      userAvatarUrl: user.image_url,
      avatarLibraryUrl: avatar_library_url,
      helpdeskId: user.helpdesk_id,
      helpdesk: %{
        id: user.helpdesk_id,
        tags:
          user.helpdesk.tags
          |> Enum.map(
            &%{
              id: &1.id,
              name: &1.name
            }
          ),
        vendorName: user.helpdesk.vendor.name
      }
    }

    {:reply, ok, session}
  end

  def info(%User{} = auth, %Session.Guest{}) do
    login_user(auth)
  end

  def info(%User{}, _), do: {:reply, Err.forbidden()}

  def info(
        %Agent{agentId: agentId, vendorId: vendorId, token: token},
        %Session.Guest{agentId: agentId}
      )
      when is_binary(agentId) do
    with %{role: :agent, id: ^agentId} <- Fog.Token.validate(token),
         agent <- Repo.Agent.from_vendor(vendorId, agentId) |> Fog.Repo.preload(:vendors),
         true <- agent != nil do
      role =
        agent.vendors
        |> Enum.find_value(fn v ->
          if v.vendor_id === vendorId do
            v.role
          else
            nil
          end
        end)

      session = Session.for_agent(vendorId, agent.id)
      {:reply, %Ok{sessionId: session.id, role: role}, session}
    else
      _ -> {:reply, Err.not_authorized()}
    end
  end

  def info(%Agent{}, _), do: {:reply, Err.forbidden()}

  def info(%Logout{}, %Session.Guest{}), do: {:reply, Err.forbidden()}

  def info(%Logout{}, session) do
    session = Session.logout(session)
    {:reply, %LogoutOk{}, session}
  end

  def info(%Resume{}, %Session.Guest{}), do: {:reply, Err.forbidden()}
  def info(%Resume{}, _), do: {:reply, Err.not_implemented()}

  def info(
        %EmailToVerify{email: email},
        %Session.User{
          userId: user_id,
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

  def info(
        %CodeToVerify{verificationCode: code},
        %Session.User{
          userId: user_id,
          verification_code: verification_code,
          verification_email: email
        } = sess
      )
      when code === verification_code do
    user = Repo.User.get(user_id) |> Repo.preload(helpdesk: [:vendor, :workspace])
    vid = user.helpdesk.vendor.id
    wid = user.helpdesk.workspace.id

    {:ok, widget_id} = Repo.Workspace.to_widget_id(wid)

    customer_name = "$Cust_External_#{Fog.Types.WorkspaceId.dump(wid) |> elem(1)}"

    user_with_email =
      Repo.User.import_external(
        vid,
        wid,
        customer_name,
        email,
        {email, email, user.image_url, customer_name},
        false
      )

    {:reply, %Ok{userId: user_with_email.id, widgetId: widget_id},
     %{
       sess
       | verification_code: nil,
         verification_request_ts: nil,
         verification_request_attempt: 0,
         verification_email: nil
     }}
  end

  def info(%CodeToVerify{}, _), do: {:reply, Err.not_found()}

  def info(_, _), do: :skip

  defp user_picture("https://avatars.dicebear.com/api/initials/" = url, %{userName: user_name}) do
    "#{url}#{user_name}.svg"
  end

  defp user_picture(_, %{userId: nil}) do
    nil
  end

  defp user_picture(url, %{userId: uexid}) do
    "#{url}#{Base.url_encode64(uexid)}.svg"
  end

  defp create_room(workspace, user, room_name) do
    workspace = workspace |> Repo.preload(:vendor)

    room =
      Repo.Room.create_private(workspace.id, [user.id], ["all"], %{
        helpdesk_id: user.helpdesk_id,
        name: room_name,
        tags: []
      })
      |> Fog.Repo.preload(workspace: :vendor)

    {:ok, room}
  end

  defp find_room(workspace, user) do
    room_name = "#{user.name} [#{Fog.Types.UserId.dump(user.id) |> elem(1)}]"

    try do
      create_room(workspace, user, room_name)
    rescue
      e ->
        case e do
          %Ecto.InvalidChangesetError{
            changeset: %Ecto.Changeset{
              errors: [
                name:
                  {"has already been taken",
                   [
                     constraint: :unique,
                     constraint_name: "room_helpdesk_id_name_index"
                   ]}
              ]
            }
          } ->
            get_room(user, room_name)

          err ->
            Logger.error("Error: #{inspect(err)}")
            {:error, err}
        end
    end
  end

  def get_room(user, room_name) do
    room =
      from(r in Data.Room,
        join: h in assoc(r, :helpdesk),
        on: h.id == ^user.helpdesk_id,
        where: r.name == ^room_name
      )
      |> Repo.one()

    room = room |> Fog.Repo.preload(workspace: :vendor)

    {:ok, room}
  end
end
