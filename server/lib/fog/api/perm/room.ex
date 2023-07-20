defmodule Fog.Api.Perm.Room do
  use Fog.Api.Perm

  action :create, [:helpdesk_id, :link_room_id, :tags]
  action :update, [:room_id, :tags]
  action :read, [:room_id]

  deny :*, guest(s)
  deny :create, !!r.link_room_id and not Perm.Room.allowed?(s, :read, room_id: r.link_room_id)

  deny :create,
       not Enum.all?(r.tags, &(tag_type(&1) in [:public, :system, {:personal, actor_id(s)}]))

  allow :create, agent(s, r.helpdesk_id) or user(s, r.helpdesk_id)
  allow :create, reader(s, r.helpdesk_id) and internal_helpdesk?(r.helpdesk_id)
  deny :create

  deny :*, not (reader(s, r.room_id) or user(s, r.room_id) or app(s, r.room_id))
  deny :*, room_type(r.room_id) != "public" and not member(s, r.room_id)
  deny :*, user(s) and flag(r.room_id, "User Tag Scoping") and not tagged(s, r.room_id)
  allow :read

  allow :update,
        agent(s, r.room_id) and
          Enum.all?(r.tags, &(tag_type(&1) in [:public, :system, {:personal, actor_id(s)}]))

  allow :update,
        app(s, r.room_id) and Enum.all?(r.tags, &(tag_type(&1) in [:public, :system]))

  allow :update,
        user(s, r.room_id) and
          Enum.all?(
            r.tags,
            &(tag_kind(&1) == {:public, "mpin"} or tag_type(&1) == {:personal, actor_id(s)})
          )

  deny :update, reader(s, r.room_id) and not internal_room?(r.room_id)

  allow :update,
        reader(s, r.room_id) and
          Enum.all?(r.tags, &(tag_type(&1) == {:personal, actor_id(s)}))
end
