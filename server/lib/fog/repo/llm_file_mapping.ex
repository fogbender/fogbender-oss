defmodule Fog.Repo.LlmFileMapping do
  import Ecto.Query

  alias Fog.{Data, Repo}

  def create(params) do
    Data.LlmFileMapping.new(params)
    |> Repo.insert!()
  end

  def provider_file_id(provider, file_id) do
    from(
      m in Data.LlmFileMapping,
      where: m.provider == ^provider,
      where: m.file_id == ^file_id,
      select: m.provider_file_id
    )
    |> Repo.one()
  end
end
