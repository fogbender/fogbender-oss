defmodule Fog.Data.GitHubInstall do
  use Fog.Data

  @derive {Jason.Encoder, only: [:installation_id]}

  schema "github_install" do
    field(:installation_id, :integer)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:installation_id])
    |> validate_required([:installation_id])
  end
end
