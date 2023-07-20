defmodule Fog.Data.HelpdeskIntegration do
  use Fog.Data
  alias Fog.Data.{Helpdesk}

  @derive {Jason.Encoder, only: [:type, :helpdesk_id, :specifics]}

  schema "helpdesk_integration" do
    field(:type, :string)
    field(:specifics, :map)

    belongs_to(:helpdesk, Helpdesk, type: Fog.Types.HelpdeskId)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:helpdesk_id, :type, :specifics])
    |> validate_required([:helpdesk_id, :type, :specifics])
    |> validate_inclusion(:type, [
      "msteams",
      "slack-customer"
    ])
  end
end
