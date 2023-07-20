defmodule Fog.Web.S2SRouter do
  require Logger
  use Plug.Router
  plug(:match)
  plug(:fetch_query_params)
  plug(:check_s2s_key)
  plug(:dispatch)

  get "/auth_check" do
    data = Jason.encode!(%{"congrats" => "it works"})

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/membership_check" do
    params = fetch_query_params(conn).params
    base64token = params["token"]
    room_id = params["roomId"]

    data =
      case uid_from_base64token(base64token) do
        {:ok, uid} ->
          try do
            case Fog.Repo.Room.get(room_id) |> Fog.Repo.preload(:members) do
              nil ->
                Jason.encode!(%{"error" => "room_not_found"})

              room ->
                case room.type do
                  "public" ->
                    Jason.encode!(%{"error" => "room_is_public"})

                  _ ->
                    case room.members |> Enum.find(&(&1.user_id == uid)) do
                      nil ->
                        Jason.encode!(%{"error" => "not_a_member"})

                      %Fog.Data.RoomMembership{role: role} ->
                        Jason.encode!(%{"role" => role})
                    end
                end
            end
          rescue
            e ->
              Logger.error("Fog.Repo.Room.get -- Room id: #{room_id} -- Error: #{inspect(e)}")
              Jason.encode!(%{"error" => "room_not_found"})
          end

        {:error, error} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/add_user_to_room" do
    params = fetch_query_params(conn).params
    base64token = params["token"]
    room_id = params["roomId"]

    data =
      case uid_from_base64token(base64token) do
        {:ok, uid} ->
          try do
            case Fog.Repo.Room.get(room_id) |> Fog.Repo.preload(:members) do
              nil ->
                Jason.encode!(%{"error" => "room_not_found"})

              room ->
                case room.type do
                  "public" ->
                    Jason.encode!(%{"error" => "room_is_public"})

                  "private" ->
                    case room.members |> Enum.find(&(&1.user_id == uid)) do
                      nil ->
                        room = Fog.Repo.Room.update_members(room_id, [uid], [])
                        :ok = Fog.Api.Event.Room.publish(room)
                        Jason.encode!("ok")

                      %Fog.Data.RoomMembership{role: role} ->
                        Jason.encode!(%{"error" => "already_member", "role" => role})
                    end

                  _ ->
                    Jason.encode!(%{"error" => "wrong_room_type"})
                end
            end
          rescue
            e ->
              Logger.error("Room id: #{room_id} -- Error: #{inspect(e)}")
              Jason.encode!(%{"error" => "room_not_found"})
          end

        {:error, error} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/add_tags_to_user" do
    params = fetch_query_params(conn).params
    tag_ids_to_add = Jason.decode!(params["tag_ids"])

    user_id_data =
      case {params["token"], params["uid"]} do
        {nil, uid} when not is_nil(uid) ->
          {:ok, uid}

        {t, nil} when not is_nil(t) ->
          uid_from_base64token(t)

        _ ->
          {:error, "Expected only one of [token, uid], got both."}
      end

    data =
      case user_id_data do
        {:ok, uid} ->
          try do
            user = Fog.Repo.User.get(uid) |> Fog.Repo.preload([:tags, :helpdesk])
            :ok = Fog.Utils.add_tags_to_author(user, tag_ids_to_add)

            Fog.Repo.Helpdesk.rooms_by_tag_ids(user.helpdesk.id, tag_ids_to_add)
            |> Enum.each(&(:ok = Fog.Api.Event.Room.publish(&1)))

            Jason.encode!("ok")
          rescue
            e ->
              Logger.error("User id: #{uid} -- Error: #{inspect(e)}")
              Jason.encode!(%{"error" => "bad_tags"})
          end

        {:error, error} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/remove_tag_from_user" do
    params = fetch_query_params(conn).params
    tag_id = params["tag_id"]

    user_id_data =
      case {params["token"], params["uid"]} do
        {nil, uid} when not is_nil(uid) ->
          {:ok, uid}

        {t, nil} when not is_nil(t) ->
          uid_from_base64token(t)

        _ ->
          {:error, "Expected only one of [token, uid], got both."}
      end

    data =
      case user_id_data do
        {:ok, uid} ->
          try do
            remove_tag_from_user(uid, tag_id)
          rescue
            e ->
              Logger.error("User id: #{uid} -- Error: #{inspect(e)}")
              Jason.encode!(%{"error" => "bad_tag"})
          end

        {:error, error} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/set_user_ban" do
    params = fetch_query_params(conn).params

    issuer =
      case params["token"] do
        t when not is_nil(t) ->
          case uid_from_base64token(t) do
            {:ok, uid} ->
              Fog.Repo.User.get(uid) |> Fog.Repo.preload([:helpdesk, :tags])

            error ->
              error
          end

        _ ->
          {:error, "Param missing: 'token'"}
      end

    banned =
      case params["uid_to_ban"] do
        uid when not is_nil(uid) ->
          Fog.Repo.User.get(uid) |> Fog.Repo.preload([:helpdesk, :tags])

        _ ->
          {:error, "Param missing: 'uid_to_ban'"}
      end

    data =
      case {issuer, banned} do
        {%Fog.Data.User{}, %Fog.Data.User{}} ->
          try do
            wid = banned.helpdesk.workspace_id
            ban_from_tag = Fog.Repo.Tag.create(wid, "user-ban-from-#{issuer.id}")
            ban_to_tag = Fog.Repo.Tag.create(wid, "user-ban-to-#{banned.id}")

            :ok = Fog.Utils.add_tags_to_author(issuer, [ban_to_tag.id])
            :ok = Fog.Utils.add_tags_to_author(banned, [ban_from_tag.id])

            Jason.encode!("ok")
          rescue
            e ->
              Logger.error("Error: #{inspect(e)}")
              Jason.encode!(%{"error" => "bad_tag"})
          end

        {%Fog.Data.User{}, nil} ->
          Jason.encode!(%{"error" => "user_to_ban_not_found"})

        {{:error, error}, _} ->
          Jason.encode!(%{"error" => error})

        {_, {:error, error}} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/reset_user_ban" do
    params = fetch_query_params(conn).params

    issuer =
      case params["token"] do
        t when not is_nil(t) ->
          {:ok, uid} = uid_from_base64token(t)
          Fog.Repo.User.get(uid) |> Fog.Repo.preload([:helpdesk, :tags])

        _ ->
          {:error, "Param missing: 'token'"}
      end

    banned =
      case params["uid"] do
        uid when not is_nil(uid) ->
          Fog.Repo.User.get(uid) |> Fog.Repo.preload([:helpdesk, :tags])

        _ ->
          {:error, "Param missing: 'uid'"}
      end

    data =
      case {issuer, banned} do
        {%Fog.Data.User{}, %Fog.Data.User{}} ->
          try do
            ban_from_tag = Fog.Data.Tag |> Fog.Repo.get_by(name: "user-ban-from-#{issuer.id}")
            ban_to_tag = Fog.Data.Tag |> Fog.Repo.get_by(name: "user-ban-to-#{banned.id}")

            remove_tag_from_user(banned.id, ban_from_tag.id)
            remove_tag_from_user(issuer.id, ban_to_tag.id)
          rescue
            e ->
              Logger.error("Error: #{inspect(e)}")
              Jason.encode!(%{"error" => "bad_tag"})
          end

        {%Fog.Data.User{}, nil} ->
          Jason.encode!(%{"error" => "user_to_reset_ban_not_found"})

        {{:error, error}, _} ->
          Jason.encode!(%{"error" => error})

        {_, {:error, error}} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/user_tags" do
    params = fetch_query_params(conn).params
    base64token = params["token"]

    data =
      case uid_from_base64token(base64token) do
        {:ok, uid} ->
          user = Fog.Repo.User.get(uid) |> Fog.Repo.preload(tags: :tag)

          Jason.encode!(
            user.tags
            # TODO somehow we can end up with an association pointing to a tag that doesn't exist
            |> Enum.filter(&(not is_nil(&1.tag)))
            |> Enum.map(&%{"id" => &1.tag.id, "name" => &1.tag.name}),
            pretty: true
          )

        {:error, error} ->
          Jason.encode!(%{"error" => error})
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/all_tags" do
    params = fetch_query_params(conn).params
    wid = params["workspace_id"]

    data = Fog.Repo.Workspace.get_tags(wid)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/add_tag" do
    params = fetch_query_params(conn).params
    wid = params["workspace_id"]
    hid = params["helpdesk_id"]
    new_tag_name = params["tag_name"]

    tag = Fog.Repo.Tag.create(wid, new_tag_name)

    data =
      try do
        room =
          Fog.Repo.Room.create(
            wid,
            helpdesk_id: hid,
            name: new_tag_name,
            type: "public",
            tags: [tag.id]
          )

        Jason.encode!(%{"tag_id" => tag.id, "room_id" => room.id})
      rescue
        _e in [Ecto.ConstraintError, Ecto.InvalidChangesetError] ->
          room = Fog.Repo.get_by(Fog.Data.Room, name: new_tag_name, helpdesk_id: hid)

          Jason.encode!(%{
            "tag" => %{name: tag.name, id: tag.id},
            "room_id" => room.id
          })
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/rename_tag" do
    params = fetch_query_params(conn).params
    tag_id = params["tag_id"]
    new_name = params["new_name"]

    old = Fog.Repo.get_by(Fog.Data.Tag, id: tag_id)

    Fog.Data.Tag.update(old, name: new_name)
    |> Fog.Repo.update!()

    data = Jason.encode!("ok")

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/email_notify" do
    params = conn.params
    token = params["token"]
    email_token = params["email_token"]
    interval = params["interval_minutes"] |> String.to_integer()

    with {:ok, user} <- email_notify_get_user(email_token, token),
         :ok <- email_notify_update_interval(user, interval),
         data <- Jason.encode!(%{user_id: user.id}) do
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(200, data)
    else
      {:error, error} ->
        error_resp(conn, Jason.encode!(%{"error" => error}))
    end
  end

  defp email_notify_get_user(email_token, nil) do
    case Fog.Token.validate(email_token) do
      %{type: "email_token", user_id: user_id} ->
        case Fog.Repo.get(Fog.Data.User, user_id) do
          %Fog.Data.User{} = u -> {:ok, u}
          _ -> {:error, :invalid_user}
        end

      {:error, :invalid} ->
        {:error, :token_invalid}

      {:error, :expired} ->
        {:error, :token_expired}

      _ ->
        {:error, :token_invalid}
    end
  end

  defp email_notify_get_user(nil, base64token) do
    case uid_from_base64token(base64token) do
      {:ok, uid} -> {:ok, Fog.Repo.get(Fog.Data.User, uid)}
      {:error, error} -> {:error, error}
    end
  end

  defp email_notify_update_interval(user, 0) do
    Fog.Repo.FeatureOption.set(user, %{email_digest_enabled: false})
    :ok
  end

  defp email_notify_update_interval(user, minutes) when minutes > 0 do
    Fog.Repo.FeatureOption.set(user, %{
      email_digest_enabled: true,
      email_digest_period: minutes * 60
    })

    :ok
  end

  defp email_notify_update_interval(_, _), do: {:error, :invalid_interval}

  match _ do
    send_resp(conn, 404, "Not found")
  end

  defp check_s2s_key(conn, _opts) do
    case check_s2s_host(conn) do
      "localhost" ->
        case get_req_header(conn, "authorization") do
          ["Bearer test"] ->
            conn

          _ ->
            error_resp(conn, Jason.encode!(%{"error" => "Bad localhost/dev token"}))
        end

      {:error, error} ->
        error_resp(conn, error)

      _ ->
        case check_s2s_auth(conn) do
          :ok ->
            conn

          {:error, error} ->
            error_resp(conn, error)
        end
    end
  end

  defp error_resp(conn, error) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, error)
    |> halt()
  end

  defp check_s2s_host(conn) do
    case get_req_header(conn, "host") do
      ["localhost" <> _] ->
        case System.get_env("FOG_ENV") do
          "dev" ->
            "localhost"

          _ ->
            {:error, Jason.encode!(%{"error" => "This only works in dev"})}
        end

      [host] ->
        host
    end
  end

  defp check_s2s_auth(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] ->
        pem = """
        -----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp71+DS5RBQcgX4fBwUos
        35fNrg92kJsiW+0B15ho3J6pV7jgyTWGQiYjvW4C4EIwdVshF9qqEYLKDNTDw5kk
        x8oTEdv3fQWHl0cRD0RdSrj0vX475aDn3x4VLmTzYVHgxU2UF3lYFoqmGlBLTkvl
        RMg7FV6z+KoEEqziVhjUoH4jB0Rdv81C5hidNKxnW3tJypait9lQxPu4Y4oiL1AO
        pWQGwaOS70M2vH8NrbpnKejf0oHPYzp7YBb3UBcHMtJVLnY5TLiHkSIK3kNf6eED
        Q5fzQ17XH0zO2NMmLY6/kLpeI1XNJK6fS5+IJ0D8Xgg3WW0JOOzqbgfd1DCzQozt
        KwIDAQAB
        -----END PUBLIC KEY-----
        """

        jwk = Joken.Signer.create("RS256", %{"pem" => pem})
        now = DateTime.to_unix(DateTime.utc_now())

        case Joken.Signer.verify(token, jwk) do
          {:ok, %{"exp" => exp}} when is_integer(exp) ->
            if now < exp do
              :ok
            else
              {:error, Jason.encode!(%{"error" => "token expired", "exp" => exp})}
            end

          {:ok, claims} ->
            {:error, Jason.encode!(%{"error" => "no exp field in token", claims => claims})}

          {:error, err} ->
            Logger.error("Failed to verify signature -- Error: #{inspect(err)}")
            {:error, Jason.encode!(%{"error" => "coun't verify token, check the key"})}
        end

      [_ | _] ->
        error = Jason.encode!(%{"error" => "authorization header is wrong"})
        {:error, error}

      _ ->
        error = Jason.encode!(%{"error" => "authorization header is missing"})
        {:error, error}
    end
  end

  defp uid_from_base64token(base64token) do
    try do
      token = Base.decode64(base64token) |> elem(1) |> Jason.decode!()
      token = for {key, val} <- token, into: %{}, do: {String.to_atom(key), val}

      case struct(Fog.Api.Auth.User, token) |> Fog.Api.Auth.login_user() do
        {:reply, %Fog.Api.Auth.Ok{userId: uid}, _} ->
          {:ok, uid}

        e ->
          Logger.error("Token login -- Token: #{base64token} -- Error: #{inspect(e)}")
          {:error, "bad_login"}
      end
    rescue
      e ->
        Logger.error("Token decode -- Token: #{base64token} -- Error: #{inspect(e)}")
        {:error, "bad_base64token"}
    end
  end

  def remove_tag_from_user(uid, tag_id) do
    case Fog.Repo.get_by(Fog.Data.AuthorTag, user_id: uid, tag_id: tag_id) do
      nil ->
        Jason.encode!(%{"error" => "no_such_tag_for_this_user"})

      author_tag ->
        user = Fog.Repo.User.get(uid) |> Fog.Repo.preload(:helpdesk)

        author_tag
        |> Fog.Repo.delete!()

        :ok = Fog.Api.Event.Tag.publish(author_tag, %{remove: true})

        Fog.Repo.Helpdesk.rooms_by_tag_ids(user.helpdesk.id, [tag_id])
        |> Enum.each(&(:ok = Fog.Api.Event.Room.publish(&1)))

        Jason.encode!("ok")
    end
  end
end
