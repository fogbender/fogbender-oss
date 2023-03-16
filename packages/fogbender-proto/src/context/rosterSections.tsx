import React from "react";
import { atom } from "jotai";
import { atomFamily, useUpdateAtom } from "jotai/utils";

import type {
  EventRosterRoom,
  EventRosterSection,
  EventRoster,
  RosterSectionId,
  RosterGetRange,
  RosterSub,
} from "../schema";

import type { useServerWs } from "../useServerWs";
import { invariant } from "../utils/invariant";

function forEach<T extends Record<any, any>>(
  o: T,
  callback: (v: [keyof T, T[keyof T]], index: number) => void
) {
  Object.entries(o).forEach(callback);
}

type EventRosterSectionWithRooms = EventRosterSection & { rooms?: EventRosterRoom[] };

function handleRosterSectionsUpdate(
  data: Map<string, EventRosterSectionWithRooms>,
  newUpdates: EventRoster[]
) {
  let needsSort = false;
  newUpdates.forEach(item => {
    if (item.msgType === "Event.RosterSection") {
      const old = data.get(item.id);
      if (!needsSort) {
        needsSort = item.pos !== old?.pos;
      }
      data.set(item.id, { ...old, ...item });
    }
    if (item.msgType === "Event.RosterRoom") {
      forEach(item.sections, ([id, pos]) => {
        const section = { id, pos: pos - 1 };
        const sectionItem = data.get(section.id) || {
          id: section.id,
          name: section.id,
          pos: 0,
          msgType: "Event.RosterSection",
          view: item.view,
          count: 0,
          unreadCount: 0,
          unresolvedCount: 0,
          mentionsCount: 0,
        };
        let rooms = sectionItem.rooms || [];
        rooms = rooms.filter(x => x.room.id !== item.room.id);
        if (rooms[section.pos]) {
          rooms.splice(section.pos, 0, item);
        } else {
          rooms[section.pos] = item;
        }
        data.set(section.id, { ...sectionItem, rooms });
      });
    }
  });

  return needsSort ? new Map(Array.from(data.entries()).sort((a, b) => a[1].pos - b[1].pos)) : data;
}

export type RosterSectionActions =
  | {
      action: "load";
      sectionId: RosterSectionId;
      view: string;
      done: () => {};
    }
  | {
      action: "update_roster";
      rosterRooms: EventRosterRoom[];
      done?: () => void;
    };

function handleRosterRoomEvent(
  data: Map<string, EventRosterSectionWithRooms>,
  rosterRoomEvent: EventRosterRoom
) {
  data.forEach(section => {
    if (!rosterRoomEvent.sections[section.id]) {
      section.rooms = section.rooms?.filter(x => x.room.id !== rosterRoomEvent.room.id);
    }
  });
  return handleRosterSectionsUpdate(data, [rosterRoomEvent]);
}

export const useConnectRosterSections = (
  ws: ReturnType<typeof useServerWs>,
  fogSessionId: string | undefined,
  workspaceId?: string,
  helpdeskId?: string
) => {
  const topic = workspaceId
    ? `workspace/${workspaceId}/roster`
    : helpdeskId
    ? `helpdesk/${helpdeskId}/roster`
    : undefined;

  const { serverCall, lastIncomingMessage } = ws;
  const {
    //
    rosterSectionsActionsAtom,
    rosterSectionsAtom,
    rosterRoomFamily,
  } = React.useMemo(() => {
    // this is slightly silly, we have to do two atoms instead of one
    // because of some kind of typescript and jotai bug
    const rosterSectionsAtom = atom(new Map<string, EventRosterSectionWithRooms>());
    const rosterSectionsActionsAtom = atom(null, (get, set, command: RosterSectionActions) => {
      if (command.action === "load") {
        const { sectionId, done } = command;
        const start = 1 + (get(rosterSectionsAtom).get(sectionId)?.rooms?.length || 0);
        serverCall<RosterGetRange>({
          msgType: "Roster.GetRange",
          topic: topic || "",
          sectionId: sectionId,
          view: command.view,
          startPos: start,
          limit: 30,
        })
          .then(x => {
            invariant(x.msgType === "Roster.GetOk", "", () =>
              console.error("failed to get roster range", topic, command, start, x)
            );
            const rosterSections = get(rosterSectionsAtom);
            set(rosterSectionsAtom, handleRosterSectionsUpdate(new Map(rosterSections), x.items));
          })
          .finally(done);
      } else if (command.action === "update_roster") {
        let newRosterSections = new Map(get(rosterSectionsAtom));
        command.rosterRooms.forEach(rosterRoom => {
          newRosterSections = handleRosterRoomEvent(newRosterSections, rosterRoom);
        });
        set(rosterSectionsAtom, newRosterSections);
      }
    });

    const rosterRoomFamily = atomFamily((roomId: string) =>
      atom(get => {
        const rosterSections = get(rosterSectionsAtom);
        for (const [, section] of Array.from(rosterSections)) {
          if (section.rooms) {
            for (const room of section.rooms) {
              if (room && room.room.id === roomId) {
                return room;
              }
            }
          }
        }
        // eslint-disable-next-line no-useless-return
        return;
      })
    );

    return { rosterSectionsAtom, rosterSectionsActionsAtom, rosterRoomFamily };
  }, []);
  const setRosterSections = useUpdateAtom(rosterSectionsAtom);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!topic) {
      return;
    }

    serverCall<RosterSub>({
      msgType: "Roster.Sub",
      topic,
      limit: 10,
    }).then(x => {
      console.assert(x.msgType === "Roster.SubOk");
      if (x.msgType === "Roster.SubOk") {
        setRosterSections(rosterSections =>
          handleRosterSectionsUpdate(new Map(rosterSections), x.items)
        );
      }
    });
  }, [fogSessionId, workspaceId, helpdeskId]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.RosterSection") {
      setRosterSections(rosterSections =>
        handleRosterSectionsUpdate(new Map(rosterSections), [lastIncomingMessage])
      );
    } else if (lastIncomingMessage?.msgType === "Event.RosterRoom") {
      setRosterSections(rosterSections =>
        handleRosterRoomEvent(new Map(rosterSections), lastIncomingMessage)
      );
    }
  }, [lastIncomingMessage]);

  return { rosterSectionsAtom, rosterSectionsActionsAtom, rosterRoomFamily };
};
