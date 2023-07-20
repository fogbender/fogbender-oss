defmodule Fog.Data.Detective do
  use Fog.Data

  @derive {Jason.Encoder, only: [:id, :email, :name]}

  @primary_key {:id, Fog.Types.DetectiveId, autogenerate: true}
  schema "detective" do
    field(:email, :string)
    field(:name, :string)

    timestamps()
  end

  def changeset(detective, params \\ %{}) do
    detective
    |> cast(params, [:id, :name, :email])
    |> validate_required([:name, :email])
    |> validate_format(:email, ~r/@/)
    |> update_change(:email, &String.downcase/1)
  end

  def add(email, name \\ nil) do
    Fog.Repo.insert(%Fog.Data.Detective{email: email, name: name || email})
  end
end
