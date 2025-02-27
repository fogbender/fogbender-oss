defmodule Fog.Data.LlmFileMapping do
  use Fog.Data

  @primary_key false
  schema "llm_file_mapping" do
    field(:provider, :string)
    field(:provider_file_id, :string)
    field(:file_id, Fog.Types.FileId)
  end

  def changeset(data, params \\ %{}) do
    fields = [:provider, :provider_file_id, :file_id]

    data
    |> cast(params, fields)
    |> validate_required(fields)
  end
end
