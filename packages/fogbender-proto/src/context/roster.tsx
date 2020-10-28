import { atom, useAtom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import {
  EventCustomer,
  EventRoom,
  RoomCreate,
  RoomMember,
  RoomOk,
  SearchOk,
  StreamGetOk,
  StreamSubOk,
} from "../schema";

import { useWs } from "./ws";

import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";

export type Room = EventRoom & {
  counterpart?: RoomMember; // when type === "dialog"
};

const eventRoomToRoom = (e: EventRoom, ourUserId: string) => {
  if (e.created) {
    const counterpart = e.members && e.members.find(m => m.id !== ourUserId);
    return counterpart ? { ...e, counterpart } : e;
  } else {
    const type: "agent" | "user" = e.agentId ? "agent" : "user";
    const counterpart = {
      id: e.agentId || e.userId,
      type,
      imageUrl: e.imageUrl,
      name: e.name,
      email: e.email,
    };

    return { ...e, counterpart };
  }
};

function useImmer<T>(initialValue: T) {
  return useImmerAtom(React.useRef(atom(initialValue)).current);
}

const rosterAtom = atom<Room[]>([]);
const rosterLoadedAtom = atom(false);
const oldestRoomTsAtom = atom(Infinity);

export const useRoster = ({
  workspaceId,
  helpdeskId,
  userId,
}: {
  workspaceId?: string;
  helpdeskId?: string;
  userId?: string;
}) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const { fogSessionId, serverCall, lastIncomingMessage } = useWs();

  const [roster, setRoster] = useImmerAtom(rosterAtom);

  const roomById = React.useCallback((id: string) => roster.find(r => r.id === id), [roster]);

  const [rosterFilter, setRosterFilter] = React.useState<string>();
  const [filteredRoster, setFilteredRoster] = React.useState([] as Room[]);
  const filteredRooms = React.useMemo(() => filteredRoster.filter(x => x.type !== "dialog"), [
    filteredRoster,
  ]);
  const filteredDialogs = React.useMemo(() => filteredRoster.filter(x => x.type === "dialog"), [
    filteredRoster,
  ]);

  const filterNotMonolog = (rooms: Room[]) =>
    rooms
      .filter(x => x.counterpart?.id !== userId)
      .filter(x => !x.members || x.members.length === 0 || !x.members.every(y => y.id === userId));

  const updateRoster = React.useCallback(
    (roomsIn: EventRoom[]) => {
      if (userId) {
        setRoster(roster => {
          let newRoster = roster;
          roomsIn.forEach(room => {
            newRoster = newRoster.filter(x => room.id !== x.id);
            newRoster.push(eventRoomToRoom(room, userId));
          });
          // TODO: convert ts to milliseconds from microseconds
          newRoster.sort((a, b) => b.updatedTs - a.updatedTs);
          return newRoster;
        });
      }
    },
    [userId]
  );

  const [rosterLoaded, setRosterLoaded] = useAtom(rosterLoadedAtom);
  const [oldestRoomTs, setOldestRoomTs] = useAtom(oldestRoomTsAtom);

  React.useEffect(() => {
    if (!workspaceId && !helpdeskId) {
      return;
    }
    if (fogSessionId) {
      const topic = workspaceId ? `workspace/${workspaceId}/rooms` : `helpdesk/${helpdeskId}/rooms`;
      serverCall({
        msgType: "Stream.Sub",
        topic,
        before: oldestRoomTs,
      }).then((x: StreamSubOk<EventRoom>) => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [fogSessionId, workspaceId, helpdeskId]);

  React.useEffect(() => {
    if (!workspaceId && !helpdeskId) {
      return;
    }
    if (fogSessionId && !rosterLoaded) {
      const topic = workspaceId ? `workspace/${workspaceId}/rooms` : `helpdesk/${helpdeskId}/rooms`;
      serverCall({
        msgType: "Stream.Get",
        topic,
        before: oldestRoomTs,
      }).then((x: StreamGetOk<EventRoom>) => {
        console.assert(x.msgType === "Stream.GetOk");

        if (x.msgType === "Stream.GetOk") {
          updateRoster(x.items);
          setOldestRoomTs(Math.min(...x.items.map(x => x.updatedTs), oldestRoomTs || Infinity));
          if (x.items.length === 0) {
            setRosterLoaded(true);
          }
        }
      });
    }
  }, [oldestRoomTs, rosterLoaded, fogSessionId, serverCall, workspaceId, helpdeskId, updateRoster]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Room") {
      updateRoster([lastIncomingMessage]);
    }
  }, [lastIncomingMessage, updateRoster]);

  const createRoom = React.useCallback(
    (params: Pick<RoomCreate, "name" | "type" | "members" | "helpdeskId">) =>
      serverCall({
        msgType: "Room.Create",
        name: params.name,
        type: params.type,
        members: params.members,
        helpdeskId: params.helpdeskId,
      }).then((x: RoomOk) => {
        console.assert(x.msgType === "Room.Ok");
        return x;
      }),
    [serverCall]
  );

  const customersRef = React.useRef<EventCustomer[]>([]);
  const customers = customersRef.current;

  const updateCustomers = React.useCallback((customersIn: EventCustomer[]) => {
    let newCustomers = customersRef.current;
    if (customersIn) {
      customersIn.forEach(customer => {
        newCustomers = newCustomers.filter(x => customer.id !== x.id);
        newCustomers.push(customer);
      });
      newCustomers.sort((a, b) => b.updatedTs - a.updatedTs);
      customersRef.current = newCustomers;
      forceUpdate();
    }
  }, []);

  React.useEffect(() => {
    if (userId && workspaceId && rosterFilter) {
      serverCall({
        msgType: "Search.Roster",
        workspaceId: workspaceId,
        term: rosterFilter,
        type: "dialog",
      }).then((x: SearchOk<EventRoom>) => {
        console.assert(x.msgType === "Search.Ok");
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && helpdeskId && rosterFilter) {
      serverCall({
        msgType: "Search.Roster",
        helpdeskId,
        term: rosterFilter,
        type: "dialog",
      }).then((x: SearchOk<EventRoom>) => {
        console.assert(x.msgType === "Search.Ok");
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && !rosterFilter) {
      setFilteredRoster(filterNotMonolog(roster.map(y => eventRoomToRoom(y, userId))));
    }
  }, [userId, roster, customers, rosterFilter, serverCall]);

  React.useEffect(() => {
    if (!workspaceId) {
      return;
    }
    serverCall({
      msgType: "Stream.Get",
      topic: `workspace/${workspaceId}/customers`,
    }).then(x => {
      console.assert(x.msgType === "Stream.GetOk");
      if (x.msgType === "Stream.GetOk") {
        updateCustomers(x.items as EventCustomer[]);
      }
    });
    serverCall({
      msgType: "Stream.Sub",
      topic: `workspace/${workspaceId}/customers`,
    }).then(x => {
      console.assert(x.msgType === "Stream.SubOk");
    });
  }, [workspaceId, updateCustomers, serverCall]);

  return {
    roster,
    roomById,
    filteredRoster,
    filteredRooms,
    filteredDialogs,
    setRosterFilter,
    createRoom,
    customers,
  };
};

export const useRoomMembers = ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string | undefined;
}) => {
  const { token, serverCall } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();
  const [rooms, setRooms] = useImmer<Room[]>([]);

  React.useEffect(() => {
    if (userId && token) {
      serverCall({
        msgType: "Search.Members",
        roomId,
      })
        .then(rejectIfUnmounted)
        .then((x: SearchOk<EventRoom>) => {
          console.assert(x.msgType === "Search.Ok");
          setRooms(y => {
            const l = y.length;
            let i = 0;

            for (i; i++; i < l) {
              y.pop();
            }

            x.items.forEach(q => {
              const r = eventRoomToRoom(q, userId);
              y.push(r);
            });
          });
        });
    }
  }, [roomId, token, serverCall]);

  return { rooms };
};
