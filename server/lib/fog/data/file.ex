defmodule Fog.Data.File do
  use Fog.Data

  @derive {Jason.Encoder, only: [:id, :filename, :content_type, :data]}
  @primary_key {:id, Fog.Types.FileId, autogenerate: true}
  schema "file" do
    belongs_to(:message, Fog.Data.Message, type: Fog.Types.MessageId)
    field(:filename, :string)
    field(:content_type, :string)
    field(:data, :map)

    # embeds_one :data, Data, on_replace: :update do
    #   field(:test, :string)
    # end

    timestamps()
  end

  def changeset(file, params \\ %{}) do
    file
    |> cast(params, [:id, :filename, :message_id, :content_type, :data])
    # |> cast_embed(:data, with: &data_changeset/2)
    |> validate_required([:filename, :content_type])
  end

  # https://hexdocs.pm/ecto/Ecto.Schema.html#embeds_one/3-examples
  # defp data_changeset(schema, params) do
  #   schema
  #   |> cast(params, [:test])
  # end
end
