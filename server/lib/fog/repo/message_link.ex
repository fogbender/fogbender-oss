defmodule Fog.Repo.MessageLink do
  alias Fog.{Data, Repo}

  def create(params) do
    Data.MessageLink.new(params)
    |> Repo.insert!()
  end
end
