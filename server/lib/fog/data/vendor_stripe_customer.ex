defmodule Fog.Data.VendorStripeCustomer do
  use Fog.Data

  @primary_key false
  schema "vendor_stripe_customer" do
    field(:vendor_id, Fog.Types.VendorId)
    field(:stripe_customer_id, :string)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:vendor_id, :stripe_customer_id])
    |> validate_required([:vendor_id, :stripe_customer_id])
  end
end
