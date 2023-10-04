defmodule Fog.Data.FeatureOption do
  use Fog.Data
  alias Fog.Data.{Vendor, Workspace, User, Agent}

  @defaults [
    tag_scope_enabled: false,
    email_digest_enabled: false,
    email_digest_period: 60 * 24 * 60,
    email_digest_template: "email_digest2",
    agent_customer_following: true,
    user_triage_following: true,
    avatar_library_url: "https://api.dicebear.com/7.x/pixel-art/",
    visitor_avatar_library_url: "https://api.dicebear.com/7.x/adventurer/",
    default_group_assignment: nil
  ]

  @derive {Jason.Encoder,
           only: [
             :email_digest_enabled,
             :email_digest_period,
             :avatar_library_url,
             :visitor_avatar_library_url,
             :default_group_assignment
           ]}
  schema "feature_option" do
    belongs_to(:vendor, Vendor, type: Fog.Types.VendorId)
    belongs_to(:workspace, Workspace, type: Fog.Types.WorkspaceId)
    belongs_to(:user, User, type: Fog.Types.UserId)
    belongs_to(:agent, Agent, type: Fog.Types.AgentId)

    field(:tag_scope_enabled, :boolean)
    field(:email_digest_enabled, :boolean)
    field(:email_digest_period, :integer)
    field(:email_digest_template, :string)
    field(:agent_customer_following, :boolean)
    field(:user_triage_following, :boolean)
    field(:avatar_library_url, :string)
    field(:visitor_avatar_library_url, :string)
    field(:default_group_assignment, :string)

    timestamps()
  end

  def changeset(feature_option, params \\ %{}) do
    feature_option
    |> cast(
      params,
      [
        :vendor_id,
        :workspace_id,
        :user_id,
        :agent_id
      ] ++ Keyword.keys(@defaults)
    )
    |> validate_required_one([:vendor_id, :workspace_id, :user_id, :agent_id])
  end

  def global_vendor_id, do: "v0"
  def global_user_id, do: "u0"
  def global_agent_id, do: "a0"

  use Fog.Data.FeatureOptionQuery, @defaults
end
