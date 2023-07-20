defmodule Fog.Data.Helpdesk do
  use Fog.Data
  alias Fog.Data.{Workspace, Customer, User, Room}

  @derive {Jason.Encoder, only: [:id, :customer_id]}

  @primary_key {:id, Fog.Types.HelpdeskId, autogenerate: true}
  schema "helpdesk" do
    belongs_to(:customer, Customer, type: Fog.Types.CustomerId)
    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId)
    has_many(:users, User)
    has_one(:vendor, through: [:workspace, :vendor])
    has_many(:rooms, Room)

    has_one(:triage, Room,
      where: [is_triage: true],
      defaults: [name: "Triage", type: "public", status: "active", is_triage: true]
    )

    has_many(:messages, through: [:rooms, :messages])
    has_many(:tags, through: [:workspace, :tags])

    field(:last_message_at, :utc_datetime_usec, virtual: true)
    field(:users_count, :integer, virtual: true)
    timestamps()
  end

  def changeset(helpdesk, params \\ %{}) do
    helpdesk
    |> cast(params, [:id, :customer_id, :workspace_id])
    |> validate_required(:customer_id)
    |> cast_assoc(:triage)
    |> cast_assoc(:users)
    |> cast_assoc(:rooms)
  end
end
