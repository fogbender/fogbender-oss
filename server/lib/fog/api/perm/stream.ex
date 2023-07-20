defmodule Fog.Api.Perm.Stream do
  use Fog.Api.Perm

  action :sub, [:ctx, :ctx_id]

  allow :sub, r.ctx == "vendor" and Perm.Vendor.allowed?(s, :read, vendor_id: r.ctx_id)
  allow :sub, r.ctx == "workspace" and Perm.Workspace.allowed?(s, :read, workspace_id: r.ctx_id)
  allow :sub, r.ctx == "helpdesk" and Perm.Helpdesk.allowed?(s, :read, helpdesk_id: r.ctx_id)
  allow :sub, r.ctx == "room" and Perm.Room.allowed?(s, :read, room_id: r.ctx_id)
  allow :sub, r.ctx in ["agent", "user"] and actor_id(s) == r.ctx_id
end
