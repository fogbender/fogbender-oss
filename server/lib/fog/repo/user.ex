defmodule Fog.Repo.User do
  import Ecto.Query
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
        {user_email, user_name, user_picture, customer_name}
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

    :ok = Fog.Service.ImportUsers.import(import_users, vendor_id, workspace_id)

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
end
