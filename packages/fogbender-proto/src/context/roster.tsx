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

export type Room = EventRoom & {
  counterpart?: RoomMember; // when type === "dialog"
};

const roomsAtom = atom<Room[]>([]);
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

  const [rooms, setRooms] = useImmerAtom(roomsAtom);

  const roomById = React.useCallback((id: string) => rooms.find(r => r.id === id), [rooms]);

  const [rosterFilter, setRosterFilter] = React.useState<string>();
  const [filteredRooms, setFilteredRooms] = React.useState([] as Room[]);

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

  const updateRoster = React.useCallback((roomsIn: EventRoom[]) => {
    setRooms(rooms => {
      let newRoster = rooms;
      roomsIn.forEach(room => {
        newRoster = newRoster.filter(x => room.id !== x.id);
        if (userId && room.type === "dialog" && room.members) {
          newRoster.push(eventRoomToRoom(room, userId));
        } else {
          newRoster.push(room);
        }
      });
      // TODO: convert ts to milliseconds from microseconds
      newRoster.sort((a, b) => b.updatedTs - a.updatedTs);
      return newRoster;
    });
  }, []);

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
    if (workspaceId && rosterFilter) {
      serverCall({
        msgType: "Search.Roster",
        workspaceId: workspaceId,
        term: rosterFilter,
        type: "dialog",
      }).then((x: SearchOk<EventRoom>) => {
        console.assert(x.msgType === "Search.Ok");
        const y = [] as Room[];
        x.items.forEach(r => {
          if (r.msgType === "Event.Room" && userId) {
            y.push(eventRoomToRoom(r, userId));
          }
        });
        setFilteredRooms(y);
      });
    } else if (helpdeskId && rosterFilter) {
      serverCall({
        msgType: "Search.Roster",
        helpdeskId,
        term: rosterFilter,
        type: "dialog",
      }).then((x: SearchOk<EventRoom>) => {
        console.assert(x.msgType === "Search.Ok");
        const y = [] as Room[];
        x.items.forEach(r => {
          if (r.msgType === "Event.Room") {
            y.push(r);
          }
        });
        setFilteredRooms(y);
      });
    } else if (!rosterFilter) {
      const y = [] as Room[];
      rooms.forEach(r => {
        if (userId) {
          y.push(eventRoomToRoom(r, userId));
        }
      });
      setFilteredRooms(y);
    }
  }, [userId, rooms, customers, rosterFilter, serverCall]);

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

  return { rooms, roomById, filteredRooms, setRosterFilter, createRoom, customers };
};
