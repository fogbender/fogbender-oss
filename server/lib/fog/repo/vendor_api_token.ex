defmodule Fog.Repo.VendorApiToken do
  import Ecto.Query
  alias Fog.{Data, Repo}

  def get(vendor_id, token_id) do
    from(t in Data.VendorApiToken,
      where:
        t.vendor_id == ^vendor_id and
          t.id == ^token_id and
          not t.is_deleted
    )
    |> Repo.one()
  end

  def get_by_scopes(vendor_id, scopes) when is_list(scopes) do
    from(t in Data.VendorApiToken,
      where:
        t.vendor_id == ^vendor_id and fragment("? <@ ?", ^scopes, t.scopes) and not t.is_deleted,
      limit: 1
    )
    |> Repo.one()
  end

  def get_or_create_by_scopes(vendor_id, agent_id, scopes) when is_list(scopes) do
    case get_by_scopes(vendor_id, scopes) do
      nil ->
        create(vendor_id, agent_id, scopes)

      token ->
        Fog.Token.for_vendor_api(vendor_id, token.id, scopes)
    end
  end

  def create(vendor_id, agent_id, scopes, description \\ "") do
    data =
      Data.VendorApiToken.new(
        vendor_id: vendor_id,
        created_by_agent_id: agent_id,
        scopes: scopes,
        description: description,
        is_deleted: false
      )
      |> Repo.insert!()

    Fog.Token.for_vendor_api(vendor_id, data.id, scopes)
  end

  def mark_deleted(vendor_id, agent_id, token_id) do
    case get(vendor_id, token_id) do
      nil ->
        {:error, :not_found}

      data ->
        Data.VendorApiToken.update(data,
          is_deleted: true,
          deleted_by_agent_id: agent_id,
          deleted_at: DateTime.utc_now()
        )
        |> Repo.update!()

        :ok
    end
  end

  def check(token) do
    case Fog.Token.validate(token) do
      {:error, _} = e ->
        e

      %{type: :vendor_api_token, token_id: token_id, vendor_id: vendor_id} ->
        case get(vendor_id, token_id) do
          nil ->
            {:error, :invalid}

          data ->
            {:ok, data}
        end
    end
  end
end
