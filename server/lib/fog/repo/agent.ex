defmodule Fog.Repo.Agent do
  import Ecto.Query
  alias Fog.Repo
  alias Fog.Data

  def get(id), do: Data.Agent |> Repo.get(id)

  def from_vendor(vendor_id, agent_id) do
    q =
      from(a in Data.Agent,
        join: v in assoc(a, :vendors),
        where: a.id == ^agent_id and v.vendor_id == ^vendor_id
      )

    Repo.one(q)
  end

  def update_last_activity(vid, id, ts) do
    from(a in Data.VendorAgentRole,
      where: a.agent_id == ^id,
      where: a.vendor_id == ^vid,
      where: is_nil(a.last_activity_at) or a.last_activity_at < ^ts
    )
    |> Repo.update_all(set: [last_activity_at: ts])
  end

  def update_last_digest_check_at(vid, id, ts) do
    from(a in Data.VendorAgentRole,
      where: a.agent_id == ^id,
      where: a.vendor_id == ^vid,
      where: is_nil(a.last_digest_check_at) or a.last_digest_check_at < ^ts
    )
    |> Repo.update_all(set: [last_digest_check_at: ts])
  end

  def tags(aid) do
    from(at in Data.AuthorTag,
      where: at.agent_id == ^aid,
      select: at.tag_id
    )
    |> Repo.all()
  end

  def get_bot_by_tag_name(workspace_id, tag_name, crash_on_nil \\ true) do
    agent =
      from(
        a in Data.Agent,
        join: at in assoc(a, :tags),
        on: at.agent_id == a.id,
        join: t in assoc(at, :tag),
        on: t.name == ^tag_name,
        where: t.workspace_id == ^workspace_id and a.is_bot == true,
        limit: 1
      )
      |> Repo.one()

    if crash_on_nil and is_nil(agent) do
      raise "Can't find bot in #{workspace_id} with tag #{tag_name}"
    end

    agent
  end

  def with_workspace(query \\ Data.Agent, workspace_id) do
    from(a in query,
      join: av in assoc(a, :vendors),
      join: w in Data.Workspace,
      on: w.id == ^workspace_id and w.vendor_id == av.vendor_id
    )
  end

  def with_helpdesk(query \\ Data.Agent, helpdesk_id) do
    from(h in Data.Helpdesk,
      join: v in assoc(h, :vendor),
      join: av in assoc(v, :agents),
      join: a in ^query,
      on: a.id == av.agent_id,
      where: h.id == ^helpdesk_id,
      select: a
    )
  end

  def get_groups(agent_id, vendor_id) do
    Data.VendorAgentGroup
    |> where([ag], ag.agent_id == ^agent_id and ag.vendor_id == ^vendor_id)
    |> Repo.all()
  end
end
