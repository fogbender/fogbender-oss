defmodule Fog.Data.FeatureFlag do
  use Fog.Data

  @derive {Jason.Encoder, only: [:id]}

  @primary_key {:id, :string, autogenerate: false}
  schema "feature_flag" do
    timestamps()
  end

  def changeset(feature_flag, params \\ %{}) do
    feature_flag
    |> cast(params, [:id])
    |> validate_required([:id])
  end
end

defmodule Fog.Data.WorkspaceFeatureFlag do
  use Fog.Data

  schema "workspace_feature_flag" do
    belongs_to(:feature_flag, Fog.Data.FeatureFlag, type: :string)
    belongs_to(:workspace, Fog.Data.Workspace, type: Fog.Types.WorkspaceId)
  end

  def changeset(workspace_feature_flag, params \\ %{}) do
    workspace_feature_flag
    |> cast(params, [:feature_flag_id, :workspace_id])
    |> validate_required([:feature_flag_id, :workspace_id])
  end
end
