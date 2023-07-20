defmodule Fog.Api.Perm.Message do
  use Fog.Api.Perm

  action :create, [:room_id, :link_room_id]
  action :update, [:message_id, :link_room_id]
  action :read, [:message_id]

  deny :*, guest(s)

  deny :create, not Perm.Room.allowed?(s, :update, room_id: r.room_id, tags: [])
  deny :create, !!r.link_room_id and not Perm.Room.allowed?(s, :read, room_id: r.link_room_id)
  allow :create

  deny :update, not Perm.Room.allowed?(s, :update, room_id: message_room(r.message_id), tags: [])
  deny :update, !!r.link_room_id and not Perm.Room.allowed?(s, :read, room_id: r.link_room_id)
  allow :update, agent(s, message_room(r.message_id))
  allow :update, author(s, r.message_id)

  deny :read, not Perm.Room.allowed?(s, :read, room_id: message_room(r.message_id))
  allow :read
end
