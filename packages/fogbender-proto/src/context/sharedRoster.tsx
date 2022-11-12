import React from "react";
import { useImmer } from "use-immer";

import type {
  AnyToken,
  EventBadge,
  EventCustomer,
  EventRoom,
  EventSeen,
  EventUser,
  RoomMember,
  StreamGet,
  StreamSub,
} from "../schema";

import {
  extractEventBadge,
  extractEventCustomer,
  extractEventRoom,
  extractEventSeen,
} from "../utils/castTypes";
import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";
import { eventRoomToRoom } from "../utils/counterpart";
import type { useServerWs } from "../useServerWs";
import { useRoomResolver } from "./useRoomResolver";

export type Room = EventRoom & {
  orderWeight?: string;
  counterpart?: RoomMember; // when type === "dialog"
};

export const useSharedRoster = ({
  ws,
  token,
  fogSessionId,
  workspaceId,
  helpdeskId,
  userId,
}: {
  ws: ReturnType<typeof useServerWs>;
  token: AnyToken | undefined;
  fogSessionId: string | undefined;
  workspaceId?: string;
  helpdeskId?: string;
  userId?: string;
}) => {
  const { serverCall, lastIncomingMessage } = ws;
  const rejectIfUnmounted = useRejectIfUnmounted();

  const [rawRoster, setRawRoster] = useImmer<Room[]>([]);
  const [rosterLoaded, setRosterLoaded] = React.useState(false);
  const [oldestRoomTs, setOldestRoomTs] = React.useState(Infinity);
  const [seenRoster, setSeenRoster] = useImmer<{ [key: string]: EventSeen }>({});
  const [badges, setBadges] = useImmer<{ [key: string]: EventBadge }>({});
  const [badgesLoaded, setBadgesLoaded] = React.useState(false);
  const [badgesPrevCursor, setBadgesPrevCursor] = React.useState<string>();
  const [customers, setCustomers] = React.useState<EventCustomer[]>([]);
  const [customersLoaded, setCustomersLoaded] = React.useState(false);
  const [oldestCustomerTs, setOldestCustomerTs] = React.useState(Infinity);
  const { onRoomRef, dispatch } = useRoomResolver(
    fogSessionId,
    serverCall,
    workspaceId,
    helpdeskId
  );
  const enoughBadges = React.useRef(0);

  React.useLayoutEffect(() => {
    // Clear roster when user's token or workspace is changed
    setRawRoster(() => []);
    setRosterLoaded(false);
    setOldestRoomTs(Infinity);
    setSeenRoster(() => ({}));
    setBadges(() => ({}));
    setBadgesLoaded(false);
    setBadgesPrevCursor(undefined);
    setCustomers([]);
    setCustomersLoaded(false);
    setOldestCustomerTs(Infinity);
    enoughBadges.current = 0;
    dispatch("token_change");
  }, [token, workspaceId, fogSessionId]);

  const roomById = React.useCallback(
    (id: string) => {
      const room = rawRoster.find(r => r.id === id);
      dispatch({ type: "roomById", roomId: id, room });
      return room;
    },
    [rawRoster]
  );
  const roomByName = React.useCallback(
    (name: string) => rawRoster.find(r => r.name === name),
    [rawRoster]
  );

  const updateBadge = React.useCallback(
    (b: EventBadge) => {
      // rooms that are higher in the roster will have unread counter or recent messages
      if (b.count || b.lastRoomMessage?.createdTs) {
        // TODO: once we have big enough roster we should probably load only rooms that have unread messages
        if (!b.count) {
          enoughBadges.current++;
        }
        if (enoughBadges.current < 10) {
          roomById(b.roomId);
        }
      }
      setBadges(x => {
        x[b.roomId] = b;
      });
    },
    [setBadges]
  );

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    // TODO maybe there's a better way to tell users and agents apart?
    if (userId) {
      const topic = userId.startsWith("a") ? `agent/${userId}/badges` : `user/${userId}/badges`;
      serverCall({
        msgType: "Stream.Sub",
        topic,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [fogSessionId, userId, serverCall]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (userId && !badgesLoaded) {
      // TODO maybe there's a better way to tell users and agents apart?
      const topic = userId.startsWith("a") ? `agent/${userId}/badges` : `user/${userId}/badges`;
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        topic,
        prev: badgesPrevCursor,
        limit: 100,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          console.assert(x.msgType === "Stream.GetOk");
          if (x.msgType === "Stream.GetOk") {
            const items = extractEventBadge(x.items);
            items.forEach(b => {
              updateBadge(b);
            });
            if (items.length === 0) {
              setBadgesLoaded(true);
            }
            setBadgesPrevCursor(x.prev || undefined);
          }
        })
        .catch(() => {});
    }
  }, [fogSessionId, userId, badgesPrevCursor, badgesLoaded, updateBadge, serverCall]);

  const updateRoster = React.useCallback(
    (roomsIn: EventRoom[]) => {
      if (userId) {
        setRawRoster(roster => {
          let newRoster = roster;
          roomsIn.forEach(room => {
            newRoster = newRoster.filter(x => room.id !== x.id);
            if (!room.remove) {
              newRoster.push(eventRoomToRoom(room, userId));
            }
          });
          return newRoster;
        });
      }
    },
    [userId]
  );

  onRoomRef.current = updateRoster;

  const updateUserAvatarUrlInRoster = React.useCallback((e: EventUser) => {
    setRawRoster(roster => {
      const newRoster: Room[] = [];
      roster.forEach(room => {
        if (room.counterpart?.id === e.userId) {
          const members =
            room.members?.map(m => {
              if (m.id === e.userId) {
                return { ...m, imageUrl: e.imageUrl };
              } else {
                return m;
              }
            }) || [];
          newRoster.push({
            ...room,
            members,
            counterpart: { ...room.counterpart, imageUrl: e.imageUrl },
          });
        } else {
          newRoster.push(room);
        }
      });
      return newRoster;
    });
  }, []);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId && !helpdeskId) {
      return;
    }
    const topic = workspaceId ? `workspace/${workspaceId}/rooms` : `helpdesk/${helpdeskId}/rooms`;
    serverCall<StreamSub>({
      msgType: "Stream.Sub",
      topic,
    }).then(x => {
      console.assert(x.msgType === "Stream.SubOk");
    });
  }, [fogSessionId, workspaceId, helpdeskId]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId && !helpdeskId) {
      return;
    }
    const topic = workspaceId ? `workspace/${workspaceId}/users` : `helpdesk/${helpdeskId}/users`;
    serverCall<StreamSub>({
      msgType: "Stream.Sub",
      topic,
    }).then(x => {
      console.assert(x.msgType === "Stream.SubOk");
    });
  }, [fogSessionId, workspaceId, helpdeskId]);
  const enoughRooms = React.useRef(false);
  enoughRooms.current = rawRoster.length >= 20;

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId && !helpdeskId) {
      return;
    }
    if (!rosterLoaded) {
      const topic = workspaceId ? `workspace/${workspaceId}/rooms` : `helpdesk/${helpdeskId}/rooms`;
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        topic,
        before: oldestRoomTs,
        limit: 30,
      }).then(x => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          const items = extractEventRoom(x.items);
          updateRoster(items);
          setOldestRoomTs(Math.min(...items.map(x => x.createdTs), oldestRoomTs || Infinity));
          const noMoreRooms = items.length === 0;
          if (noMoreRooms || enoughRooms.current) {
            setRosterLoaded(true);
          }
        }
      });
    }
  }, [fogSessionId, oldestRoomTs, rosterLoaded, serverCall, workspaceId, helpdeskId, updateRoster]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (userId) {
      // TODO maybe there's a better way to tell users and agents apart?
      const topic = userId.startsWith("a") ? `agent/${userId}/seen` : `user/${userId}/seen`;
      serverCall({
        msgType: "Stream.Sub",
        topic,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });

      serverCall({
        msgType: "Stream.Get",
        topic,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          console.assert(x.msgType === "Stream.GetOk");
          if (x.msgType === "Stream.GetOk") {
            const seen = extractEventSeen(x.items);
            seen.forEach(x => setSeenRoster(r => ({ ...r, [x.roomId]: x })));
          }
        })
        .catch(() => {});
    }
  }, [fogSessionId, userId, serverCall]);

  const updateCustomers = React.useCallback((customersIn: EventCustomer[]) => {
    setCustomers(customers => {
      let newCustomers = customers;
      customersIn.forEach(customer => {
        newCustomers = newCustomers.filter(x => customer.id !== x.id);
        newCustomers.push(customer);
      });
      newCustomers.sort((a, b) => b.updatedTs - a.updatedTs);
      setCustomers(newCustomers);
      return newCustomers;
    });
  }, []);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId) {
      return;
    }
    serverCall({
      msgType: "Stream.Sub",
      topic: `workspace/${workspaceId}/customers`,
    }).then(x => {
      console.assert(x.msgType === "Stream.SubOk");
    });
  }, [fogSessionId, workspaceId]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId || customersLoaded) {
      return;
    }
    serverCall<StreamGet>({
      msgType: "Stream.Get",
      topic: `workspace/${workspaceId}/customers`,
      before: oldestCustomerTs,
    }).then(x => {
      console.assert(x.msgType === "Stream.GetOk");
      if (x.msgType === "Stream.GetOk") {
        const items = extractEventCustomer(x.items);
        updateCustomers(items);
        setOldestCustomerTs(Math.min(...items.map(x => x.createdTs), oldestCustomerTs || Infinity));
        if (items.length === 0) {
          setCustomersLoaded(true);
        }
      }
    });
  }, [fogSessionId, workspaceId, customersLoaded, oldestCustomerTs, updateCustomers, serverCall]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Room") {
      updateRoster([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Badge") {
      updateBadge(lastIncomingMessage);
    } else if (lastIncomingMessage?.msgType === "Event.Customer") {
      updateCustomers([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Seen") {
      setSeenRoster(r => ({ ...r, [lastIncomingMessage.roomId]: lastIncomingMessage }));
    } else if (lastIncomingMessage?.msgType === "Event.User") {
      updateUserAvatarUrlInRoster(lastIncomingMessage);
    }
  }, [lastIncomingMessage, updateRoster, updateBadge]);

  const roster = React.useMemo(() => {
    return rawRoster
      .concat()
      .filter(x => !workspaceId || x.workspaceId === workspaceId)
      .sort((a, b) => {
        const badgeA = badges[a.id]?.count > 0;
        const badgeB = badges[b.id]?.count > 0;

        if (badgeA && !badgeB) {
          return 1;
        } else if (!badgeA && badgeB) {
          return -1;
        } else {
          const aTs = badges[a.id]?.lastRoomMessage?.createdTs || a.createdTs || 0; // shouldn't happen
          const bTs = badges[b.id]?.lastRoomMessage?.createdTs || b.createdTs || 0; // "         "
          return aTs - bTs;
        }
      })
      .reverse();
  }, [rawRoster, badges, workspaceId]);

  return React.useMemo(() => {
    return {
      roster,
      roomById,
      roomByName,
      badges,
      customers,
      seenRoster,
      setSeenRoster,
    };
  }, [roster, roomById, roomByName, badges, customers, seenRoster, setSeenRoster]);
};
