defmodule Fog.Repo.File do
  alias Fog.{Data, Repo}

  def create(params) do
    Data.File.new(params)
    |> Repo.insert!()
  end

  def update(id, params) do
    # maybe some kind of validation that the same file does not change message_id and or message_id is in the same room
    Data.File
    |> Repo.get(id)
    |> Data.File.update(params)
    |> Repo.update!()
  end
end
