defmodule Fog.Api.Auth do
  use Fog.Api.Handler

  alias Fog.Api.{Session, Event}
  alias Fog.{Repo, Data, Api}
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

  defmsg(Visitor, [:widgetId, :localTimestamp, :token, :visitorKey])

  defmsg(Agent, [:vendorId, :agentId, :token])

  defmsg(Resume, [:vendorId, :sessionId, :token])
  defmsg(Logout, [:vendorId, :sessionId])

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
    :widgetId,
    :isVisitor,
    :emailVerified,
    :visitorToken
  ])

  defmsg(LogoutOk, [])
  deferr(Err)

  def info(%User{} = auth, %Session.Guest{headers: headers}) do
    login_user(auth, headers)
  end

  def info(%User{}, _), do: {:reply, Err.forbidden()}

  def info(%Visitor{token: token} = auth, %Session.Guest{headers: headers})
      when not is_nil(token) do
    login_user(auth, headers)
  end

  def info(
        %Visitor{widgetId: widget_id, token: nil, localTimestamp: local_timestamp} = auth,
        %Session.Guest{headers: headers}
      ) do
    with {:ok, %Data.Workspace{visitors_enabled: true} = workspace} <-
           Repo.Workspace.from_widget_id(widget_id),
         true <- workspace.visitor_key == auth.visitorKey,
         %{user: user, room: room} <-
           Repo.User.provision_visitor(workspace.vendor_id, workspace.id, local_timestamp) do
      Event.publish(room)

      token =
        Fog.UserSignature.jwt_sign(
          %{widgetId: widget_id, userId: user.id, visitor: true},
          workspace.signature_secret
        )

      login_user(%Visitor{widgetId: widget_id, token: token}, headers)
    else
      _ -> {:reply, Err.not_authorized()}
    end
  end

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

  def info(_, _), do: :skip

  def login_user(%User{} = auth), do: login_user(auth, %{})

  def login_user(%User{widgetId: widget_id} = auth, headers) do
    with {:ok, workspace} <- Repo.Workspace.from_widget_id(widget_id),
         {signature_type, signature} <- signature(auth, workspace.signature_type),
         :ok <- check_user_signature(auth, signature, signature_type, workspace.signature_secret),
         %Data.User{} = user <- import_user(auth, workspace),
         :ok = Fog.Service.UserAuthTask.schedule(user_id: user.id, headers: headers) do
      login_response(user, workspace)
    else
      _ -> {:reply, Err.not_authorized()}
    end
  end

  def login_user(%Visitor{widgetId: widget_id, token: visitor_token} = auth, headers) do
    with {:ok, workspace} <- Repo.Workspace.from_widget_id(widget_id),
         {:ok, user_id} <- check_visitor_signature(auth.token, "jwt", workspace.signature_secret),
         %Data.User{} = user <- load_visitor(user_id, workspace),
         :ok = Fog.Service.UserAuthTask.schedule(user_id: user.id, headers: headers) do
      login_response(user, workspace, visitor_token)
    else
      _ -> {:reply, Err.not_authorized()}
    end
  end

  defp check_visitor_signature(signature, signature_type, signature_secret) do
    case Fog.UserSignature.verify_user_signature(
           signature,
           %{userId: ""},
           signature_type,
           signature_secret
         ) do
      {:claims, %{"userId" => user_id, "visitor" => true}} ->
        {:ok, user_id}

      {:claims, claims} ->
        error = "invalid visitor token: #{inspect(claims)}"
        Logger.error(error)
        {:error, error}

      error ->
        Logger.error("visitor signature check failed: #{inspect(error)}")
        error
    end
  end

  defp check_user_signature(%User{} = auth, signature, signature_type, signature_secret) do
    case Fog.UserSignature.verify_user_signature(
           signature,
           auth,
           signature_type,
           signature_secret
         ) do
      :ok ->
        :ok

      {:error, :signature_is_nil} ->
        check_widget_key(auth, signature_secret)

      error ->
        Logger.error("user signature check failed: #{inspect(error)}")
        error
    end
  end

  def check_widget_key(%{widgetKey: widget_key}, signature_secret) do
    case Fog.UserSignature.verify_widget_key(widget_key, signature_secret) do
      :ok ->
        :ok

      error ->
        Logger.error("widget key check failed: #{inspect(error)}")
        error
    end
  end

  defp signature(%User{userToken: token}, _) when is_binary(token), do: {"token", token}
  defp signature(%User{userPaseto: paseto}, "paseto" = t), do: {t, paseto}
  defp signature(%User{userJWT: jwt}, "jwt" = t), do: {t, jwt}
  defp signature(%User{userHMAC: hmac}, t), do: {t, hmac}

  defp user_picture(%User{userAvatarUrl: nil} = auth, workspace) do
    {:default, user_picture_url(Repo.FeatureOption.get(workspace).avatar_library_url, auth)}
  end

  defp user_picture(%User{userAvatarUrl: user_picture}, _), do: user_picture

  defp with_triage?(%User{customerName: "$Cust_External_" <> _}), do: false
  defp with_triage?(_), do: true

  defp import_user(%User{} = auth, workspace) do
    user_picture = user_picture(auth, workspace)
    with_triage = with_triage?(auth)

    Repo.User.import_external(
      workspace.vendor_id,
      workspace.id,
      auth.customerId,
      auth.userId,
      {auth.userEmail, auth.userName, user_picture, auth.customerName},
      with_triage
    )
  end

  defp load_visitor(user_id, workspace) do
    helpdesk = Repo.Helpdesk.get_external(workspace.id)
    Repo.User.from_helpdesk(helpdesk.id, user_id)
  end

  defp login_response(%Data.User{} = user, workspace, visitor_token \\ nil) do
    session = Session.for_user(workspace.vendor_id, user.helpdesk_id, user.id)

    session = %Session.User{
      session
      | is_visitor: Api.Visitor.is_visitor?(user),
        email_verified: Api.Visitor.email_verified?(user)
    }

    user = user |> Repo.preload(helpdesk: [:tags, :customer, :vendor])

    unless user.last_activity_at,
      do: Repo.User.update_last_activity(user.id, DateTime.utc_now())

    avatar_library_url = Repo.FeatureOption.get(workspace).avatar_library_url

    res = %Ok{
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
      },
      isVisitor: user.is_visitor,
      visitorToken: visitor_token,
      emailVerified: user.email_verified
    }

    {:reply, res, session}
  end

  defp user_picture_url("https://avatars.dicebear.com/api/initials/" = url, %{userName: user_name}) do
    "#{url}#{user_name}.svg"
  end

  defp user_picture_url(_, %{userId: nil}) do
    nil
  end

  defp user_picture_url(url, %{userId: uexid}) do
    "#{url}#{Base.url_encode64(uexid)}.svg"
  end
end
