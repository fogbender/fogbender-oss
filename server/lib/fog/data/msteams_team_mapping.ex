defmodule Fog.Data.MsTeamsTeamMapping do
  use Fog.Data

  @doc """
  	When the bot is added to a team, we get two team ids:

  	"team": {
  		"aadGroupId": "15aa5934-4e21-4af2-ba3e-0220e048b751",
  		"name": "Mark 8 Project Team",
  		"id": "19:0cb1a7dc3db8463c804082a5cb188a33@thread.tacv2"
  	}

  	But on new messages, webhook data looks like this:
  	"channelData": {
  		"teamsChannelId": "19:ff416aa80e1f4dd2a2d86de401febb18@thread.tacv2",
  		"teamsTeamId": "19:0cb1a7dc3db8463c804082a5cb188a33@thread.tacv2",
  		"channel": {
  				"id": "19:ff416aa80e1f4dd2a2d86de401febb18@thread.tacv2"
  		},
  		"team": {
  				"id": "19:0cb1a7dc3db8463c804082a5cb188a33@thread.tacv2"
  		},
  		"tenant": {
  				"id": "270a0ed8-690a-4fc1-9325-2478cdaa2cd3"
  		}
  	}

  	There does not appear to be any way to get the team id in GUID form at this stage,
  	so we need a mapping table.

  """

  @primary_key false
  schema "msteams_team_mapping" do
    field(:team_id, :string)
    field(:team_aad_group_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:team_id, :team_aad_group_id])
    |> validate_required([:team_id, :team_aad_group_id])
  end
end
