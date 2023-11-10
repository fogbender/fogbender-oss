defmodule Fog.Data.Agent do
  use Fog.Data

  alias Fog.Data.{
    AgentSchedule,
    AuthorTag,
    Fogvite,
    VendorAgentGroup,
    VendorAgentRole,
    WorkspaceAgentRole
  }

  defimpl Jason.Encoder, for: Fog.Data.Agent do
    def encode(value, opts) do
      Fog.Utils.optional_encode(
        [:id, :name, :email, :image_url],
        [:my_fogvites, :fogvited],
        value,
        opts
      )
    end
  end

  @primary_key {:id, Fog.Types.AgentId, autogenerate: true}
  schema "agent" do
    field(:email, :string)
    field(:name, :string)
    field(:image_url, :string)
    field(:is_bot, :boolean)
    has_many(:vendors, VendorAgentRole)
    has_many(:workspaces, WorkspaceAgentRole)
    has_many(:tags, AuthorTag, on_replace: :delete)
    has_many(:groups, VendorAgentGroup)

    has_many(:my_fogvites, Fogvite, on_replace: :delete, foreign_key: :sender_agent_id)
    has_many(:fogvited, Fogvite, on_replace: :delete, foreign_key: :accepted_by_agent_id)

    has_many(:schedules, AgentSchedule)

    field(:from_name_override, :string, virtual: true)
    field(:from_image_url_override, :string, virtual: true)

    timestamps()
  end

  def changeset(agent, params \\ %{}) do
    agent
    |> cast(params, [:id, :name, :email, :image_url, :is_bot])
    |> validate_required([:name, :email])
    |> validate_format(:image_url, ~r/^http/)
    |> validate_format(:email, ~r/@/)
    |> update_change(:email, &String.downcase/1)
    |> cast_assoc(:workspaces)
    |> cast_assoc(:vendors)
    |> cast_assoc(:tags)
    |> cast_assoc(:groups)
  end

  def is_fogvited?(agent) do
    agent = Fog.Repo.preload(agent, :fogvited)
    agent.fogvited |> Enum.any?(&(&1.deleted_at == nil))
  end
end
