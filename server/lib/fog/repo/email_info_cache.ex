defmodule Fog.Repo.EmailInfoCache do
  import Ecto.Query, only: [from: 2]
  alias Fog.{Data, Repo}

  def get(email, provider),
    do:
      from(
        i in Data.EmailInfoCache,
        where: i.provider == ^provider,
        where: i.email == ^email
      )
      |> Repo.one()

  def add(email, provider, info) do
    Data.EmailInfoCache.new(
      email: email,
      provider: provider,
      info: info
    )
    |> Repo.insert!(
      on_conflict: [set: [info: info, updated_at: DateTime.utc_now()]],
      conflict_target: [:email, :provider]
    )

    :ok
  end

  def delete(email) do
    from(
      i in Data.EmailInfoCache,
      where: i.email == ^email
    )
    |> Repo.delete_all()
  end
end
