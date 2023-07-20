defmodule Fog.Data.User do
  use Fog.Data
  alias Fog.Data.{AuthorTag, Helpdesk, UserEvent}

  @derive {Jason.Encoder, only: [:id, :name, :email, :external_uid]}
  @primary_key {:id, Fog.Types.UserId, autogenerate: true}
  schema "user" do
    belongs_to(:helpdesk, Helpdesk, type: Fog.Types.HelpdeskId)
    field(:email, :string)
    field(:name, :string)
    field(:external_uid, :string)
    field(:image_url, :string)
    field(:last_activity_at, :utc_datetime_usec)
    field(:last_digest_check_at, :utc_datetime_usec)

    has_one(:customer, through: [:helpdesk, :customer])
    has_one(:workspace, through: [:helpdesk, :workspace])
    has_one(:vendor, through: [:workspace, :vendor])
    has_many(:events, UserEvent)
    has_many(:tags, AuthorTag, on_replace: :delete)

    timestamps()
  end

  def changeset(user, params \\ %{}) do
    user
    |> cast(params, [
      :id,
      :helpdesk_id,
      :email,
      :name,
      :external_uid,
      :image_url,
      :last_digest_check_at,
      :last_activity_at
    ])
    |> validate_required([:email, :name])
    |> validate_format(:email, ~r/@/)
    |> update_change(:email, &String.downcase/1)
    |> unique_constraint(:email, name: "user_email_uniq_index")
    |> cast_assoc(:events)
    |> cast_assoc(:tags)
  end
end
