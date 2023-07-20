defmodule Fog.Data.CustomerInfoLog do
  use Fog.Data
  alias Fog.Data.{Customer}

  schema "customer_info_log" do
    belongs_to(:customer, Customer, type: Fog.Types.CustomerId)
    field(:source, :string)
    field(:data, :map)
    timestamps()
  end

  def changeset(customer_info_log, params \\ %{}) do
    customer_info_log
    |> cast(params, [
      :customer_id,
      :source,
      :data
    ])
  end
end
