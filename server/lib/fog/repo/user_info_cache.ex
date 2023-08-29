defmodule Fog.Repo.UserInfoCache do
  import Ecto.Query, only: [from: 2]
  alias Fog.{Data, Repo}

  def get(user_id),
    do:
      from(
        i in Data.UserInfoCache,
        where: i.user_id == ^user_id
      )
      |> Repo.all()

  def get(user_id, provider),
    do:
      from(
        i in Data.UserInfoCache,
        where: i.provider == ^provider,
        where: i.user_id == ^user_id
      )
      |> Repo.one()

  def add(user_id, provider, info) do
    Data.UserInfoCache.new(
      user_id: user_id,
      provider: provider,
      info: info
    )
    |> Repo.insert!(
      on_conflict: [set: [info: info, updated_at: DateTime.utc_now()]],
      conflict_target: [:user_id, :provider]
    )

    :ok
  end

  def delete(user_id) do
    from(
      i in Data.UserInfoCache,
      where: i.user_id == ^user_id
    )
    |> Repo.delete_all()
  end
end
