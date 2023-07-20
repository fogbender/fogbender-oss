defmodule Fog.Data.Org do
  use Ecto.Schema

  schema "org" do
    field(:name, :string)
    field(:domain, :string)
    field(:logo, :string)
    field(:site, :string)

    timestamps()
  end
end
