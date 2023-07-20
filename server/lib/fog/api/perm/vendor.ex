defmodule Fog.Api.Perm.Vendor do
  use Fog.Api.Perm

  action :read, [:vendor_id]

  allow :read, agent(s, r.vendor_id)
end
