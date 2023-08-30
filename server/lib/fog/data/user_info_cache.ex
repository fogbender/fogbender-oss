defmodule Fog.Data.UserInfoCache do
  use Fog.Data
  alias Fog.Data.{User}

  @primary_key false
  schema "user_info_cache" do
    belongs_to(:user, User, type: Fog.Types.UserId)
    field(:provider, :string)
    field(:info, :map)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [
      :user_id,
      :provider,
      :info
    ])
    |> validate_required([:user_id, :provider, :info])
  end
end
