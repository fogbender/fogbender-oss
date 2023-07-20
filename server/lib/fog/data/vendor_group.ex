defmodule Fog.Data.VendorGroup do
  use Fog.Data
  alias Fog.Data.{Vendor}

  @primary_key false
  schema "vendor_group" do
    belongs_to(:vendor, Vendor, primary_key: true, type: Fog.Types.VendorId)
    field(:group, :string, primary_key: true)

    timestamps()
  end

  def changeset(group, params \\ %{}) do
    group
    |> cast(params, [:vendor_id, :group])
    |> validate_required([:vendor_id, :group])
    |> unique_constraint([:vendor_id, :group], name: :vendor_group_uq_index)
  end
end
