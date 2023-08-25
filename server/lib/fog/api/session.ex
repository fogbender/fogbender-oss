defmodule Fog.Api.Session do
  alias Fog.Repo

  defmodule User do
    defstruct [
      :id,
      :vendorId,
      :helpdeskId,
      :userId,
      :roster,
      eventId: 0,
      typing_ref: :undefined,
      lastActivityTs: 0,
      pending_notifications: %{},
      is_visitor: false,
      email_verified: true,
      verification_code: nil,
      verification_request_ts: nil,
      verification_request_attempt: 0,
      verification_email: nil
    ]
  end

  defmodule Agent do
    defstruct [
      :id,
      :vendorId,
      :agentId,
      :roster,
      eventId: 0,
      typing_ref: :undefined,
      lastActivityTs: 0,
      pending_notifications: %{},
      groups: [],
      groups_load_ts: nil
    ]
  end

  defmodule Guest do
    defstruct [
      :agentId,
      typing_ref: :undefined
    ]
  end

  @type t :: %Guest{} | %User{} | %Agent{}

  def guest() do
    %Guest{}
  end

  def guest_agent(agent_id) do
    %Guest{agentId: agent_id}
  end

  def for_user(vendor_id, helpdesk_id, user_id) do
    %User{
      id: next_id(),
      vendorId: vendor_id,
      helpdeskId: helpdesk_id,
      userId: user_id
    }
  end

  def for_agent(vendor_id, agent_id) do
    %Agent{
      id: next_id(),
      vendorId: vendor_id,
      agentId: agent_id
    }
  end

  def logout(_) do
    guest()
  end

  def actor_id(%User{userId: user_id}), do: user_id
  def actor_id(%Agent{agentId: agent_id}), do: agent_id
  def actor_id(_), do: nil

  def agent_id(%Agent{agentId: agent_id}), do: agent_id
  def agent_id(_), do: nil

  def user_id(%User{userId: user_id}), do: user_id
  def user_id(_), do: nil

  def load_groups(_, delay_sec \\ 60)

  def load_groups(%Agent{} = sess, delay_sec) do
    ts = DateTime.utc_now()

    if sess.groups_load_ts == nil or DateTime.diff(sess.groups_load_ts, ts) > delay_sec do
      groups = Repo.Agent.get_groups(sess.agentId, sess.vendorId)
      %Agent{sess | groups: groups, groups_load_ts: ts}
    else
      sess
    end
  end

  def load_groups(sess, _), do: sess

  defp next_id() do
    {:ok, id} = Snowflake.next_id()
    id |> to_string()
  end
end
