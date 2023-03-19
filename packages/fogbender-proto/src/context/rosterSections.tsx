import React from "react";
import { atom, useAtomValue } from "jotai";
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

const defaultSectionsOrder = [
  "PINNED",
  "ASSIGNED TO ME", // agent only
  "ASSIGNED", // agent only
  "PRIVATE", // user only
  "OPEN", // agent only
  "INBOX", // user only
  "DIRECT",
  "ARCHIVED",
];

function handleRosterSectionsUpdate(
  data: Map<string, EventRosterSectionWithRooms>,
  newUpdates: EventRoster[]
) {
  // it needs to be sorted if it's a new section, otherwise it will end up at the bottom
  let needsSort = false;
  newUpdates.forEach(item => {
    if (item.msgType === "Event.RosterSection") {
      const old = data.get(item.id);
      if (!needsSort && old === undefined) {
        needsSort = true;
      }
      data.set(item.id, { ...old, ...item });
    }
    if (item.msgType === "Event.RosterRoom") {
      forEach(item.sections, ([id, pos]) => {
        const section = { id, pos: pos - 1 };
        const old = data.get(section.id);
        if (!needsSort && old === undefined) {
          needsSort = true;
        }
        const sectionItem = old || {
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

  return needsSort
    ? new Map(
        Array.from(data.entries()).sort(([a], [b]) => {
          const aPos = defaultSectionsOrder.indexOf(a);
          const bPos = defaultSectionsOrder.indexOf(b);
          if (aPos === -1 || bPos === -1) {
            console.warn("unknown section position", aPos, bPos, a, b);
          }
          return aPos - bPos;
        })
      )
    : data;
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

  const { serverCall, lastIncomingMessageAtom } = ws;
  const lastIncomingMessage = useAtomValue(lastIncomingMessageAtom);
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
        const start = calculateStartPos(get(rosterSectionsAtom).get(sectionId));
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

function calculateStartPos(section?: EventRosterSectionWithRooms) {
  if (!section || !section.rooms) {
    return 1;
  }
  const rooms = section.rooms;
  for (let i = 0; i < rooms.length; i++) {
    const pos = i + 1;
    const has = rooms.some(x => x?.sections[section.id] === pos);
    if (!has) {
      return pos;
    }
  }
  return rooms.length + 1;
}

const memo = new Map<string, [EventRosterSectionWithRooms, number]>();
export function calculateStartPosMemo(section: EventRosterSectionWithRooms) {
  const old = memo.get(section.id);
  if (old && old[0] === section) {
    return old[1];
  }
  const pos = calculateStartPos(section);
  memo.set(section.id, [section, pos]);
  return pos;
}
