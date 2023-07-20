defmodule Fog.Data.Tag do
  use Fog.Data
  alias Fog.Data.{Workspace}

  @derive {Jason.Encoder, only: [:id, :name, :workspace_id]}

  @primary_key {:id, Fog.Types.TagId, autogenerate: true}
  schema "tag" do
    field(:name, :string)
    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId)
    timestamps()

    field(:integration, :any, virtual: true)
    field(:integration_issue, :any, virtual: true)
  end

  def changeset(tag, params \\ %{}) do
    tag
    |> cast(params, [:id, :name, :workspace_id])
    |> validate_required(:workspace_id)
    |> validate_required(:name, message: "tag name cannot be empty")
  end
end
