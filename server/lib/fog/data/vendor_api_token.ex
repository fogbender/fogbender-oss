defmodule Fog.Data.VendorApiToken do
  use Fog.Data
  alias Fog.Data.{Agent, Vendor}

  schema "vendor_api_token" do
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    belongs_to(:created_by_agent, Agent, type: Fog.Types.AgentId)
    field(:scopes, {:array, :string})
    field(:description, :string)

    field(:is_deleted, :boolean)
    field(:deleted_at, :utc_datetime_usec)
    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)

    timestamps()
  end

  def changeset(vendor_api_token, params \\ %{}) do
    vendor_api_token
    |> cast(params, [
      :vendor_id,
      :created_by_agent_id,
      :scopes,
      :description,
      :is_deleted,
      :deleted_at,
      :deleted_by_agent_id
    ])
  end
end
