defmodule Fog.Data.EmailInfoCache do
  use Fog.Data

  @primary_key false
  schema "email_info_cache" do
    field(:email, :string)
    field(:provider, :string)
    field(:info, :map)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [
      :email,
      :provider,
      :info
    ])
    |> validate_required([:email, :provider, :info])
  end
end
