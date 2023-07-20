defmodule Fog.Data.ConnectCode do
  use Fog.Data

  @primary_key false
  schema "connect_code" do
    field(:helpdesk_id, Fog.Types.HelpdeskId)
    field(:code, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:helpdesk_id, :code])
    |> validate_required([:helpdesk_id, :code])
  end
end
