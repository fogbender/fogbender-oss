defmodule Fog.Data.PromptCluster do
  use Fog.Data

  @primary_key false
  schema "prompt_cluster" do
    field(:id, :string, primary_key: true)
    field(:cluster_id, :string, primary_key: true)
    field(:source_id, :binary_id)
    field(:prompt, :string)
    field(:data, :map)
    field(:embedding, {:array, :float})
    field(:status, :string)

    timestamps()
  end

  def changeset(embeddings_cache, params \\ %{}) do
    embeddings_cache
    |> cast(params, [
      :id,
      :cluster_id,
      :source_id,
      :prompt,
      :data,
      :embedding,
      :status
    ])
    |> unique_constraint([:id, :cluster_id],
      name: :prompt_cluster_id_uniq_index
    )
    |> validate_required([:prompt, :cluster_id, :source_id, :data])
    |> validate_inclusion(:status, ["fetching", "ready", "error"])
  end
end
