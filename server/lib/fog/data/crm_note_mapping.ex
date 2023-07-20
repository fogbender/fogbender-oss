defmodule Fog.Data.CrmNoteMapping do
  use Fog.Data

  @primary_key false
  schema "crm_note_mapping" do
    field(:room_id, Fog.Types.RoomId, primary_key: true)
    field(:crm_id, :string, primary_key: true)
    field(:crm_type, :string, primary_key: true)
    field(:inserted_at, :naive_datetime, primary_key: true)

    field(:note_id, :string)

    timestamps(inserted_at: false)
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:room_id, :crm_id, :crm_type, :note_id, :inserted_at])
    |> validate_required([:room_id, :crm_id, :crm_type, :inserted_at])
  end
end
