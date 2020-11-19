import { atom, useAtom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import {
  EventBadge,
  EventCustomer,
  EventRoom,
  RoomCreate,
  RoomMember,
  RoomOk,
  RoomUpdate,
  SearchOk,
  StreamGetOk,
  StreamSubOk,
} from "../schema";

import { useWs } from "./ws";

import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";

export type Room = EventRoom & {
  orderWeight?: string;
  counterpart?: RoomMember; // when type === "dialog"
};

const eventRoomToRoom = (e: EventRoom, ourUserId: string) => {
  if (e.created) {
    const counterpart = e.type === "dialog" && e.members?.find(m => m.id !== ourUserId);
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

  const [badges, setBadges] = useImmer<{ [roomId: string]: EventBadge }>({});

  const rejectIfUnmounted = useRejectIfUnmounted();

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
      .filter(
        x =>
          x.type !== "dialog" ||
          !x.members ||
          x.members.length === 0 ||
          !x.members.every(y => y.id === userId)
      );

  const sortRoster = (roster: Room[]) => {
    return roster
      .sort((a, b) => {
        if (a.orderWeight && b.orderWeight) {
          if (a.orderWeight === b.orderWeight) {
            return 0;
          } else {
            return a.orderWeight < b.orderWeight ? -1 : 1;
          }
        } else if (a.orderWeight) {
          return 1;
        } else if (b.orderWeight) {
          return -1;
        } else {
          return a.updatedTs - b.updatedTs;
        }
      })
      .reverse();
  };

  const updateRoster = React.useCallback(
    (roomsIn: EventRoom[]) => {
      if (userId) {
        setRoster(roster => {
          let newRoster = roster;
          roomsIn.forEach(room => {
            newRoster = newRoster.filter(x => room.id !== x.id);
            const r = eventRoomToRoom(room, userId);

            const badge = badges[r.id];

            if (badge?.lastUnreadMessageId) {
              newRoster.push({ ...r, orderWeight: badge.lastUnreadMessageId });
            } else {
              newRoster.push(r);
            }
          });
          // TODO: convert ts to milliseconds from microseconds
          // newRoster.sort((a, b) => b.updatedTs - a.updatedTs);
          newRoster = sortRoster(newRoster);
          return newRoster;
        });
      }
    },
    [userId]
  );

  const updateRosterWithBadge = React.useCallback(
    (badge: EventBadge) => {
      if (userId) {
        setRoster(roster => {
          const newRoster = roster.map(room => {
            if (room.id === badge.roomId && badge.count > 0) {
              const { lastUnreadMessageId } = badge;
              return { ...room, orderWeight: lastUnreadMessageId };
            } else if (room.id === badge.roomId && badge.count === 0) {
              return { ...room };
            } else {
              return room;
            }
          });

          return sortRoster(newRoster);
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
          setOldestRoomTs(Math.min(...x.items.map(x => x.createdTs), oldestRoomTs || Infinity));
          if (x.items.length === 0) {
            setRosterLoaded(true);
          }
        }
      });
    }
  }, [oldestRoomTs, rosterLoaded, fogSessionId, serverCall, workspaceId, helpdeskId, updateRoster]);

  React.useEffect(() => {
    if (fogSessionId && rosterLoaded) {
      // TODO maybe there's a better way to tell users and agents apart?
      if (userId && userId.startsWith("a")) {
        serverCall({
          msgType: "Stream.Get",
          topic: `agent/${userId}/badges`,
        })
          .then(rejectIfUnmounted)
          .then(x => {
            console.assert(x.msgType === "Stream.GetOk");
            if (x.msgType === "Stream.GetOk") {
              x.items.forEach(b => {
                if (b.msgType === "Event.Badge") {
                  updateBadge(b);
                  updateRosterWithBadge(b);
                }
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [userId, rosterLoaded, serverCall]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Room") {
      updateRoster([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Badge") {
      updateBadge(lastIncomingMessage);
      updateRosterWithBadge(lastIncomingMessage);
    }
  }, [lastIncomingMessage, updateRoster, updateRosterWithBadge]);

  const createRoom = React.useCallback(
    (
      params: Pick<
        RoomCreate,
        | "name"
        | "type"
        | "members"
        | "helpdeskId"
        | "tags"
        | "linkRoomId"
        | "linkStartMessageId"
        | "linkEndMessageId"
      >
    ) =>
      serverCall({
        msgType: "Room.Create",
        name: params.name,
        type: params.type,
        members: params.members,
        helpdeskId: params.helpdeskId,
        tags: params.tags,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then((x: RoomOk) => {
        console.assert(x.msgType === "Room.Ok");
        return x;
      }),
    [serverCall]
  );

  const updateRoom = React.useCallback(
    (
      params: Pick<
        RoomUpdate,
        "roomId" | "name" | "membersToAdd" | "membersToRemove" | "tagsToAdd" | "tagsToRemove"
      >
    ) =>
      serverCall({
        msgType: "Room.Update",
        roomId: params.roomId,
        name: params.name,
        membersToAdd: params.membersToAdd,
        membersToRemove: params.membersToRemove,
        tagsToAdd: params.tagsToAdd,
        tagsToRemove: params.tagsToRemove,
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

  const updateBadge = React.useCallback(
    (b: EventBadge) => {
      setBadges(x => {
        x[b.roomId] = x[b.roomId] || {};
        x[b.roomId] = b;
      });
    },
    [setBadges]
  );

  React.useEffect(() => {
    // TODO maybe there's a better way to tell users and agents apart?
    if (userId && userId.startsWith("a")) {
      serverCall({
        msgType: "Stream.Sub",
        topic: `agent/${userId}/badges`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [fogSessionId, updateBadge, workspaceId, userId, serverCall]);

  return {
    roster,
    roomById,
    filteredRoster,
    filteredRooms,
    filteredDialogs,
    setRosterFilter,
    createRoom,
    updateRoom,
    customers,
    badges,
  };
};

export const useRoomMembers = ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string | undefined;
}) => {
  const { token, serverCall, lastIncomingMessage } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();
  const [rooms, setRooms] = useImmer<Room[]>([]);
  const [roomUpdate, setRoomUpdate] = useImmer<EventRoom | undefined>(undefined);

  React.useEffect(() => {
    if (userId && lastIncomingMessage?.msgType === "Event.Room") {
      if (lastIncomingMessage.id === roomId) {
        setRoomUpdate(() => {
          return lastIncomingMessage;
        });
      }
    }
  }, [lastIncomingMessage]);

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
            const len = y.length;

            for (let i = 0; i < len; i++) {
              y.shift();
            }

            x.items.forEach(q => {
              const r = eventRoomToRoom(q, userId);
              y.push(r);
            });
          });
        })
        .catch(() => {});
    }
  }, [roomUpdate, roomId, token, serverCall]);

  return { rooms };
};

export const useUserTags = ({ userId }: { userId: string | undefined }) => {
  const { token, serverCall, lastIncomingMessage } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();

  React.useEffect(() => {
    if (userId && lastIncomingMessage?.msgType === "Event.Tag") {
      console.log(lastIncomingMessage);
    }
  }, [lastIncomingMessage]);

  React.useEffect(() => {
    if (userId && userId.startsWith("u") && token) {
      const topic = `user/${userId}/tags`;
      serverCall({
        msgType: "Stream.Get",
        topic,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          console.assert(x.msgType === "Stream.GetOk");
          console.log(x);
        })
        .catch(() => {});

      serverCall({
        msgType: "Stream.Sub",
        topic,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [userId, token, serverCall]);

  return {};
};
