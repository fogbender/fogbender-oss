defmodule Fog.Data.Fogvite do
  use Fog.Data
  alias Fog.Data.{Agent}

  @derive {Jason.Encoder,
           only: [
             :id,
             :sender_agent_id,
             :invite_sent_to_email,
             :fogvite_code,
             :accepted_by_agent_id,
             :deleted_at
           ]}
  @primary_key {:id, Fog.Types.FoginviteId, autogenerate: true}

  schema "fogvite" do
    field(:invite_sent_to_email, :string)
    belongs_to(:sender_agent, Agent, type: Fog.Types.AgentId)
    belongs_to(:accepted_by_agent, Agent, type: Fog.Types.AgentId)
    field(:fogvite_code, :string)
    field(:deleted_at, :utc_datetime_usec)
    timestamps()
  end

  def changeset(fogvite, params \\ %{}) do
    fogvite
    |> cast(params, [
      :id,
      :sender_agent_id,
      :invite_sent_to_email,
      :fogvite_code,
      :accepted_by_agent_id,
      :deleted_at
    ])
    |> assoc_constraint(:sender_agent)
  end

  def filter_not_deleted(fogvites) do
    fogvites |> Enum.filter(&(&1.deleted_at == nil))
  end
end
