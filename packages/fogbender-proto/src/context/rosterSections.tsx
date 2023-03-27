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
export type RosterSections = Map<string, EventRosterSectionWithRooms>;

const defaultSectionsOrder = [
  "PINNED",
  "ASSIGNED TO ME", // agent only
  "ASSIGNED", // agent only
  "PRIVATE", // user only
  "OPEN", // agent only
  "INBOX", // user only
  "DIRECT",
  "CLOSED",
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
          console.log(a, b);
          const aPos = defaultSectionsOrder.indexOf(a);
          const bPos = defaultSectionsOrder.indexOf(b);
          if (aPos === -1 && !a.startsWith("CUSTOMER:")) {
            console.warn("unknown section position", aPos, a);
          }
          if (bPos === -1 && !b.startsWith("CUSTOMER:")) {
            console.warn("unknown section position", bPos, b);
          }
          if (a.startsWith("TAG:") && !b.startsWith("TAG:")) {
            return 1;
          } else if (!a.startsWith("TAG:") && b.startsWith("TAG:")) {
            return -1;
          } else {
            return aPos - bPos;
          }
        })
      )
    : data;
}

function handleRosterViewSectionsUpdate(
  data: Map<string, Map<string, EventRosterSectionWithRooms>>,
  newUpdates: EventRoster[]
) {
  const updatesPerView = new Map<string, EventRoster[]>();
  newUpdates.forEach(item => {
    const array = updatesPerView.get(item.view) || [];
    array.push(item);
    updatesPerView.set(item.view, array);
  });

  updatesPerView.forEach((updates, view) => {
    let newRosterSections = new Map(data.get(view));
    newRosterSections = handleRosterSectionsUpdate(newRosterSections, updates);
    data.set(view, newRosterSections);
  });
  return data;
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
    }
  | {
      action: "reset_view";
      items: EventRoster[];
    };

function handleRosterRoomEvent(
  data: Map<string, Map<string, EventRosterSectionWithRooms>>,
  rosterRoomEvent: EventRosterRoom
) {
  data.forEach(view => {
    view.forEach(section => {
      if (!rosterRoomEvent.sections[section.id]) {
        section.rooms = section.rooms?.filter(x => x.room.id !== rosterRoomEvent.room.id);
      }
    });
  });
  return handleRosterViewSectionsUpdate(data, [rosterRoomEvent]);
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
    isRosterReadyAtom,
    rosterSectionsActionsAtom,
    rosterViewSectionsAtom,
    rosterRoomFamily,
  } = React.useMemo(() => {
    const isRosterReadyAtom = atom(false);
    // this is slightly silly, we have to do two atoms instead of one
    // because of some kind of typescript and jotai bug
    const rosterViewSectionsAtom = atom(
      new Map([["main", new Map<string, EventRosterSectionWithRooms>()]])
    );
    const rosterSectionsActionsAtom = atom(null, (get, set, command: RosterSectionActions) => {
      if (command.action === "load") {
        const { sectionId, done, view } = command;
        const start = calculateStartPos(get(rosterViewSectionsAtom).get(view)?.get(sectionId));
        serverCall<RosterGetRange>({
          msgType: "Roster.GetRange",
          topic: topic || "",
          sectionId: sectionId,
          view,
          startPos: start,
          limit: 30,
        })
          .then(x => {
            invariant(x.msgType === "Roster.GetOk", "", () =>
              console.error("failed to get roster range", topic, command, start, x)
            );
            const rosterViews = get(rosterViewSectionsAtom);
            set(
              rosterViewSectionsAtom,
              handleRosterViewSectionsUpdate(new Map(rosterViews), x.items)
            );
          })
          .finally(done);
      } else if (command.action === "update_roster") {
        let newRosterSections = new Map(get(rosterViewSectionsAtom));
        command.rosterRooms.forEach(rosterRoom => {
          newRosterSections = handleRosterRoomEvent(newRosterSections, rosterRoom);
        });
        set(rosterViewSectionsAtom, newRosterSections);
      } else if (command.action === "reset_view") {
        setRosterViewSections(rosterViewSections =>
          handleRosterViewSectionsUpdate(new Map(rosterViewSections), command.items)
        );
      }
    });

    const rosterRoomFamily = atomFamily((roomId: string) =>
      atom(get => {
        // main always exists
        const rosterSections = get(rosterViewSectionsAtom).get("main")!;
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

    return {
      isRosterReadyAtom,
      rosterViewSectionsAtom,
      rosterSectionsActionsAtom,
      rosterRoomFamily,
    };
  }, []);
  const setRosterViewSections = useUpdateAtom(rosterViewSectionsAtom);
  const setIsRosterReady = useUpdateAtom(isRosterReadyAtom);

  React.useEffect(() => {
    setIsRosterReady(false);
  }, [fogSessionId]);

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
        setIsRosterReady(true);
        setRosterViewSections(rosterViewSections =>
          handleRosterViewSectionsUpdate(new Map(rosterViewSections), x.items)
        );
      }
    });
  }, [fogSessionId, workspaceId, helpdeskId]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.RosterSection") {
      setRosterViewSections(rosterViewSections =>
        handleRosterViewSectionsUpdate(new Map(rosterViewSections), [lastIncomingMessage])
      );
    } else if (lastIncomingMessage?.msgType === "Event.RosterRoom") {
      setRosterViewSections(rosterViewSections =>
        handleRosterRoomEvent(new Map(rosterViewSections), lastIncomingMessage)
      );
    }
  }, [lastIncomingMessage]);

  return {
    isRosterReadyAtom,
    rosterViewSectionsAtom,
    rosterSectionsActionsAtom,
    rosterRoomFamily,
  };
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
