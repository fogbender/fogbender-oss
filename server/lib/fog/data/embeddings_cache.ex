defmodule Fog.Data.EmbeddingsCache do
  use Fog.Data

  @primary_key false
  schema "embeddings_cache" do
    field(:prompt_id, :string, primary_key: true)
    field(:prompt, :string)
    field(:model, :string)
    field(:tokens, :integer)
    field(:embedding, {:array, :float})

    timestamps()
  end

  def changeset(embeddings_cache, params \\ %{}) do
    embeddings_cache
    |> cast(params, [
      :prompt_id,
      :prompt,
      :model,
      :tokens,
      :embedding
    ])
    |> validate_required([:prompt_id, :prompt, :model, :tokens, :embedding])
  end
end
