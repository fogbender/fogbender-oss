defmodule Fog.Data.MsTeamsUserMapping do
  use Fog.Data

  @primary_key false
  schema "msteams_user_mapping" do
    field(:user_id, Fog.Types.UserId)
    field(:msteams_team_id, :string)
    field(:msteams_user_id, :string)
    field(:helpdesk_id, Fog.Types.HelpdeskId)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:user_id, :msteams_team_id, :msteams_user_id, :helpdesk_id])
    |> validate_required([:user_id, :msteams_team_id, :msteams_user_id, :helpdesk_id])
  end
end
