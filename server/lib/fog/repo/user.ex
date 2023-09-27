defmodule Fog.Repo.User do
  import Ecto.Query

  require Logger

  alias Fog.{Data, Repo}

  def get(id), do: Data.User |> Fog.Repo.get(id)

  def from_vendor(vendor_id, user_id) do
    q =
      from(u in Data.User,
        join: v in assoc(u, :vendor),
        where: u.id == ^user_id and v.id == ^vendor_id
      )

    Repo.one(q)
  end

  def from_helpdesk(helpdesk_id, user_id) do
    from(u in Data.User,
      where: u.id == ^user_id and u.helpdesk_id == ^helpdesk_id
    )
    |> Repo.one()
  end

  def get_external(vid, wid, cid, uid) do
    q =
      from(u in Data.User,
        join: w in assoc(u, :workspace),
        join: h in assoc(u, :helpdesk),
        join: c in assoc(u, :customer),
        where:
          w.id == ^wid and w.vendor_id == ^vid and c.external_uid == ^cid and
            u.external_uid == ^uid
      )

    Fog.Repo.one(q)
  end

  def get_external_by_email(_vid, _wid, _cid, nil), do: nil

  def get_external_by_email(vid, wid, cid, email) do
    q =
      from(u in Data.User,
        join: w in assoc(u, :workspace),
        join: h in assoc(u, :helpdesk),
        join: c in assoc(u, :customer),
        where:
          w.id == ^wid and w.vendor_id == ^vid and c.external_uid == ^cid and
            u.email == ^(email |> String.downcase())
      )

    Fog.Repo.one(q)
  end

  def import_external(
        vendor_id,
        workspace_id,
        customer_external_uid,
        user_external_uid,
        {user_email, user_name, user_picture, customer_name},
        with_triage \\ true
      ) do
    import_users = [
      %Fog.Data.ImportUser{
        customer_name: customer_name,
        customer_id: customer_external_uid,
        user_name: user_name,
        user_email: user_email,
        user_picture: user_picture,
        user_id: user_external_uid
      }
    ]

    :ok = Fog.Service.ImportUsers.import(import_users, vendor_id, workspace_id, with_triage)

    get_external_by_email(vendor_id, workspace_id, customer_external_uid, user_email)
  end

  def update_last_activity(id, ts) do
    from(u in Data.User,
      where: u.id == ^id,
      where: is_nil(u.last_activity_at) or u.last_activity_at < ^ts
    )
    |> Repo.update_all(set: [last_activity_at: ts])
  end

  def update_last_digest_check_at(id, ts) do
    from(u in Data.User,
      where: u.id == ^id,
      where: is_nil(u.last_digest_check_at) or u.last_digest_check_at < ^ts
    )
    |> Repo.update_all(set: [last_digest_check_at: ts])
  end

  def update(id, params) do
    Data.User
    |> Repo.get(id)
    |> Data.User.update(params)
    |> Repo.update!()
  end

  def tags(uid) do
    from(at in Data.AuthorTag,
      where: at.user_id == ^uid,
      select: at.tag_id
    )
    |> Repo.all()
  end

  def with_workspace(query \\ Data.User, workspace_id) do
    from(u in query,
      join: h in assoc(u, :helpdesk),
      on: h.workspace_id == ^workspace_id
    )
  end

  def with_helpdesk(query \\ Data.User, helpdesk_id) do
    where(query, [u], u.helpdesk_id == ^helpdesk_id)
  end

  def intel(%Data.User{email: email, id: user_id} = user) do
    infos = Fog.Repo.UserInfoCache.get(user_id)

    apollo = intel_apollo(email)
    headers = intel_headers(infos)
    geoapify = intel_geoapify(user_id, headers, infos)

    %{
      "user" => user,
      "apollo" => apollo,
      "headers" => headers,
      "geoapify" => geoapify
    }
  end

  def provision_visitor(
        vendor_id,
        workspace_id,
        local_timestamp
      ) do
    customer = Repo.Helpdesk.get_external(workspace_id).customer
    uexid = "visitor-#{Snowflake.next_id() |> elem(1)}"

    user_picture = "https://api.dicebear.com/7.x/adventurer/svg?seed=#{Base.url_encode64(uexid)}"

    user_name = "#{Fog.Names.name()} from #{Fog.Names.place()}"
    user_email = "#{uexid}@example.com"

    user =
      import_external(
        vendor_id,
        workspace_id,
        customer.external_uid,
        uexid,
        {user_email, user_name, user_picture, customer.name},
        false
      )

    user = Repo.User.update(user.id, is_visitor: true, email_verified: false)

    room_name = "#{user.name} [#{Fog.Types.UserId.dump(user.id) |> elem(1)}]"
    display_name_for_agent = "#{user.name}"
    display_name_for_user = "Chat from #{local_timestamp}"

    room =
      %Data.Room{} =
      Repo.Room.create_private(workspace_id, [user.id], ["all"], %{
        helpdesk_id: user.helpdesk_id,
        name: room_name,
        display_name_for_user: display_name_for_user,
        display_name_for_agent: display_name_for_agent,
        tags: []
      })

    %{user: user, room: room}
  end

  defp intel_apollo(email) do
    # TODO: check for user with verified email only
    case Fog.Apollo.Api.match(email) do
      {:ok, %{"person" => info}} ->
        info

      _ ->
        %{}
    end
  end

  defp intel_headers(infos) do
    case infos |> Enum.find(&(&1.provider === "headers")) do
      nil ->
        %{}

      %Data.UserInfoCache{info: info} ->
        info
    end
  end

  defp intel_geoapify(user_id, headers, infos) do
    case headers["ip"] do
      nil ->
        %{}

      ip when is_binary(ip) ->
        case infos |> Enum.find(&(&1.provider === "geoapify")) do
          %Data.UserInfoCache{info: %{"ip" => ^ip} = info} ->
            info

          nil ->
            case Fog.Geoapify.Api.locate(ip) do
              {:ok, info} ->
                :ok = Fog.Repo.UserInfoCache.add(user_id, "geoapify", info)
                info

              err ->
                Logger.error("Geoapify failed: #{inspect(err)}")
                %{}
            end
        end
    end
  end
end
