defmodule Fog.Data.LlmThreadRoomMapping do
  use Fog.Data

  @primary_key false
  schema "llm_thread_room_mapping" do
    field(:room_id, Fog.Types.RoomId)
    field(:thread_id, :string)
    field(:provider, :string)

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:room_id, :thread_id, :provider])
    |> validate_required([:room_id, :thread_id, :provider])
  end
end
