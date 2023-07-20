defmodule Fog.Data.SlackCustomerUserMapping do
  use Fog.Data

  @primary_key false
  schema "slack_customer_user_mapping" do
    field(:user_id, Fog.Types.UserId)
    field(:slack_team_id, :string)
    field(:slack_user_id, :string)
    field(:helpdesk_id, Fog.Types.HelpdeskId)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:user_id, :slack_team_id, :slack_user_id, :helpdesk_id])
    |> validate_required([:user_id, :slack_team_id, :slack_user_id, :helpdesk_id])
  end
end
