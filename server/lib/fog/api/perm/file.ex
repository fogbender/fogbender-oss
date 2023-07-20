defmodule Fog.Api.Perm.File do
  use Fog.Api.Perm

  action :upload, [:room_id]

  allow :upload, Perm.Room.allowed?(s, :update, room_id: r.room_id, tags: [])
end
