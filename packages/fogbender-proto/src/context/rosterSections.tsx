import React from "react";
import { atom, PrimitiveAtom, WritableAtom } from "jotai";
import { useUpdateAtom } from "jotai/utils";

import type {
  EventRosterRoom,
  EventRosterSection,
  EventRoster,
  RosterSectionId,
  RosterGetRange,
  RosterSub,
} from "../schema";

import { useWs } from "./ws";

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
          pos: section.pos,
          msgType: "Event.RosterSection",
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

type RosterSectionActions = {
  action: "load";
  sectionId: RosterSectionId;
  done: () => {};
};

export type RosterSectionsAtom = PrimitiveAtom<Map<string, EventRosterSectionWithRooms>>;
export type RosterSectionsActionsAtom = WritableAtom<null, RosterSectionActions, void>;

export const useRosterSections = () => {
  const { serverCall, workspaceId, lastIncomingMessage, fogSessionId, helpdeskId } = useWs();

  const { rosterSectionsActionsAtom, rosterSectionsAtom } = React.useMemo(() => {
    // this is slightly silly, we have to do two atoms instead of one
    // because of some kind of typescript and jotai bug
    const rosterSectionsAtom = atom(new Map<string, EventRosterSectionWithRooms>());
    const rosterSectionsActionsAtom = atom(null, (get, set, command: RosterSectionActions) => {
      if (command.action === "load") {
        const { sectionId, done } = command;
        const start = 1 + (get(rosterSectionsAtom).get(sectionId)?.rooms?.length || 0);
        serverCall<RosterGetRange>({
          msgType: "Roster.GetRange",
          topic: `workspace/${workspaceId}/roster`,
          sectionId: sectionId,
          startPos: start,
          limit: 30,
        })
          .then(x => {
            console.assert(x.msgType === "Roster.GetOk");
            if (x.msgType === "Roster.GetOk") {
              const rosterSections = get(rosterSectionsAtom);
              set(rosterSectionsAtom, handleRosterSectionsUpdate(new Map(rosterSections), x.items));
            }
          })
          .finally(done);
      }
    });
    return { rosterSectionsAtom, rosterSectionsActionsAtom };
  }, []);
  const setRosterSections = useUpdateAtom(rosterSectionsAtom);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId) {
      return;
    }

    serverCall<RosterSub>({
      msgType: "Roster.Sub",
      topic: `workspace/${workspaceId}/roster`,
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
      setRosterSections(rosterSections => {
        const data = new Map(rosterSections);
        data.forEach(section => {
          if (!lastIncomingMessage.sections[section.id]) {
            section.rooms = section.rooms?.filter(x => x.room.id !== lastIncomingMessage.room.id);
          }
        });
        return handleRosterSectionsUpdate(data, [lastIncomingMessage]);
      });
    }
  }, [lastIncomingMessage]);

  return { rosterSectionsAtom, rosterSectionsActionsAtom };
};
