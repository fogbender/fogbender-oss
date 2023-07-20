defmodule Fog.Data.EmbeddingsSource do
  use Fog.Data
  alias Fog.Data.{Agent, Workspace}

  @derive {Jason.Encoder, only: [:id, :parent_id, :text, :url, :description, :status]}
  @primary_key {:id, :binary_id, autogenerate: true}
  schema "embeddings_source" do
    field(:parent_id, :binary_id)
    field(:text, :string)
    field(:url, :string)
    field(:description, :string)
    field(:status, :string)
    field(:restrict_path, :string)
    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId)

    belongs_to(:deleted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:deleted_at, :utc_datetime_usec)

    timestamps()
  end

  def changeset(model, params \\ %{}) do
    model
    |> cast(params, [
      :id,
      :parent_id,
      :text,
      :url,
      :description,
      :status,
      :restrict_path,
      :workspace_id,
      :deleted_at,
      :deleted_by_agent_id
    ])
    |> validate_required([:url, :workspace_id])
    |> validate_inclusion(:status, ["ready", "error", "candidate", "fetching", "404", "400"])
    |> unique_constraint([:workspace_id, :url], name: :embeddings_source_workspace_id_url_index)
  end
end
