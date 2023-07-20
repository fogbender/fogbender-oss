defmodule Fog.Api.Perm.Tag do
  use Fog.Api.Perm

  action :create, [:workspace_id, :tag]
  action :update, [:workspace_id, :tag, :new_tag]
  action :delete, [:workspace_id, :tag]

  deny :*, tag_type(r.tag) != :public
  deny :update, tag_type(r.new_tag) != :public

  allow :*, admin(s, r.workspace_id)
end
