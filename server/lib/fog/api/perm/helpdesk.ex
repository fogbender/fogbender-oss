defmodule Fog.Api.Perm.Helpdesk do
  use Fog.Api.Perm

  action :read, [:helpdesk_id]

  allow :read, agent(s, r.helpdesk_id) or user(s, r.helpdesk_id)
end
