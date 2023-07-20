defmodule Fog.Api.Perm.User do
  use Fog.Api.Perm

  action :update, [:user_id]

  allow :update, actor_id(s) === r.user_id
end
