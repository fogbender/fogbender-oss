defmodule Fog.Data.SubscriptionEmail do
  use Ecto.Schema

  schema "subscription_emails" do
    field(:email, :string)
    field(:user_info, :string)

    timestamps()
  end
end
