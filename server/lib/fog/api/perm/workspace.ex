defmodule Fog.Api.Perm.Workspace do
  use Fog.Api.Perm

  action :read, [:workspace_id]

  allow :read, reader(s, r.workspace_id)
end
