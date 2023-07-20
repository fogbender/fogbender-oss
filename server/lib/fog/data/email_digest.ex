defmodule Fog.Data.EmailDigest do
  use Fog.Data
  alias Fog.Data.{User, Agent, Vendor, Workspace, Badge}

  embedded_schema do
    # "user" | "agent"
    field(:to_type, :string)
    belongs_to(:agent, Agent)
    belongs_to(:user, User)
    belongs_to(:vendor, Vendor)
    belongs_to(:workspace, Workspace)
    field(:created_at, :utc_datetime_usec)
    field(:last_activity_at, :utc_datetime_usec)
    field(:email_digest_period, :integer)
    field(:email_digest_template, :string)
    has_many(:badges, Badge)
  end

  def changeset(digest, _params \\ %{}) do
    digest
  end
end
