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
      headers: %{},
      is_visitor: false,
      email_verified: true,
      verification_code: nil,
      verification_email: nil,
      verification_attempts: 0,
      agent_name_override_enabled: false,
      agent_name_override: ""
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
      groups_load_ts: nil,
      headers: %{}
    ]
  end

  defmodule Guest do
    defstruct [
      :agentId,
      typing_ref: :undefined,
      headers: %{}
    ]
  end

  @type t :: %Guest{} | %User{} | %Agent{}

  def guest(headers \\ %{}) do
    %Guest{headers: headers}
  end

  def guest_agent(agent_id, headers \\ %{}) do
    %Guest{agentId: agent_id, headers: headers}
  end

  def for_user(vendor_id, helpdesk_id, user_id) do
    ws = Repo.Workspace.get_by_helpdesk(helpdesk_id)
    %User{
      id: next_id(),
      vendorId: vendor_id,
      helpdeskId: helpdesk_id,
      userId: user_id,
      agent_name_override_enabled: ws.agent_name_override != "",
      agent_name_override: ws.agent_name_override
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
