defmodule Fog.Data.AuthorTag do
  use Fog.Data
  alias Fog.Data.{Agent, User, Tag}

  schema "author_tag" do
    belongs_to(:agent, Agent, type: Fog.Types.AgentId, on_replace: :update)
    belongs_to(:user, User, type: Fog.Types.UserId)
    belongs_to(:tag, Tag, type: Fog.Types.TagId, on_replace: :update)
  end

  def changeset(author_tag, params \\ %{}) do
    author_tag
    |> cast(params, [:id, :agent_id, :user_id, :tag_id])
    |> unique_constraint([:agent_id, :tag_id])
    |> unique_constraint([:user_id, :tag_id])
  end
end
