defmodule Fog.Api.Auth do
  use Fog.Api.Handler
  alias Fog.Api.{Session}
  alias Fog.{Repo, Data}
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
  defmsg(Resume, [:vendorId, :sessionId, :token])
  defmsg(Logout, [:vendorId, :sessionId])

  defmsg(Ok, [
    :sessionId,
    :userId,
    :userAvatarUrl,
    :avatarLibraryUrl,
    :helpdesk,
    :helpdeskId,
    :role
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
              user =
                Repo.User.import_external(
                  vid,
                  wid,
                  cexid,
                  uexid,
                  {user_email, user_name, user_picture, customer_name}
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

        user = user |> Repo.preload(helpdesk: [:tags, :vendor])

        unless user.last_activity_at,
          do: Repo.User.update_last_activity(user.id, DateTime.utc_now())

        {:ok, workspace} = workspace
        avatar_library_url = Repo.FeatureOption.get(workspace).avatar_library_url

        ok = %Ok{
          sessionId: session.id,
          userId: user.id,
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
end
