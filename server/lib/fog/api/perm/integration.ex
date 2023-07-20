defmodule Fog.Api.Perm.Integration do
  use Fog.Api.Perm

  action :create_issue, [:workspace_id, :room_id]
  action :label_issue, [:workspace_id]
  action :issue_info, [:workspace_id]
  action :close_issue, [:workspace_id]
  action :reopen_issue, [:workspace_id]

  deny :*, not agent(s, r.workspace_id)
  allow :create_issue, Perm.Room.allowed?(s, :read, room_id: r.room_id)
  allow :label_issue, agent(s, r.workspace_id)
  allow :issue_info, agent(s, r.workspace_id)
  allow :close_issue, agent(s, r.workspace_id)
  allow :reopen_issue, agent(s, r.workspace_id)
end
