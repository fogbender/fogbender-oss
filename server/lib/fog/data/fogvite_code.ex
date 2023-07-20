defmodule Fog.Data.FogviteCode do
  use Fog.Data

  @derive {Jason.Encoder, only: [:code, :limit, :disabled]}

  @primary_key false

  schema "fogvite_code" do
    field(:code, :string, primary_key: true)
    field(:limit, :integer)
    # has_many(:fogvites, Fogvite)
    field(:disabled, :boolean, default: false)
    timestamps()
  end

  def changeset(fogvite_code, params \\ %{}) do
    fogvite_code
    |> cast(params, [
      :code,
      :limit,
      :disabled
    ])
  end
end
