defmodule Fog.Api.Event.RosterSection do
  use Fog.StructAccess

  defstruct [
    :msgType,
    :msgId,
    :view,
    :name,
    :id,
    :pos,
    :count,
    :unreadCount,
    :mentionsCount,
    :unresolvedCount,
    :entityType,
    :entity
  ]

  @type t() :: %__MODULE__{
          msgType: Api.msg_type(),
          msgId: Api.msg_id(),
          view: String.t(),
          name: String.t(),
          id: String.t(),
          pos: integer(),
          count: integer(),
          unreadCount: integer(),
          mentionsCount: integer(),
          unresolvedCount: integer()
        }
end
