defmodule Fog.Api.Event.RosterRoom do
  use Fog.StructAccess
  alias Fog.{Api, Api.Event}

  defstruct [
    :msgType,
    :msgId,
    :roomId,
    :view,
    :sections,
    :room,
    :badge
  ]

  @type t() :: %__MODULE__{
          msgType: Event.msg_type(),
          msgId: Event.msg_id(),
          view: Api.Roster.view_name(),
          roomId: String.t(),
          sections: %{Api.Roster.section() => Api.Roster.pos()},
          room: Event.Room.t(),
          badge: Event.Badge.t()
        }
end
