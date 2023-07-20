defmodule Fog.Data.MessageFile do
  use Fog.Data

  alias Fog.{Types}
  alias Fog.Data.{File, Message}

  @primary_key false
  schema "message_file" do
    belongs_to(:message, Message, primary_key: true, type: Types.MessageId)
    belongs_to(:file, File, primary_key: true, type: Types.FileId)

    timestamps()
  end

  def changeset(data, params \\ %{}) do
    data
    |> cast(params, [:message_id, :file_id])
  end
end
