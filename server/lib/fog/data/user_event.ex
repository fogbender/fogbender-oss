defmodule Fog.Data.UserEvent do
  use Fog.Data
  alias Fog.Data.{User}

  @derive {Jason.Encoder, only: [:id, :user_id, :event]}
  @primary_key {:id, Fog.Types.UserEventId, autogenerate: true}
  schema "user_event" do
    belongs_to(:user, User, type: Fog.Types.UserId)
    field(:event, :string)
    field(:meta, :string)
    timestamps()
  end

  def changeset(user_event, params \\ %{}) do
    user_event
    |> cast(params, [:id, :user_id, :event, :meta])
    |> validate_required([:event])
    |> validate_inclusion(:event, ~w(email_notification login logout))
  end
end
