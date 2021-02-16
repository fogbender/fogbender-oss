import React from "react";
import { useImmer } from "use-immer";

import {
  AnyToken,
  EventBadge,
  EventCustomer,
  EventRoom,
  EventSeen,
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
import { useServerWs } from "../useServerWs";

export type Room = EventRoom & {
  orderWeight?: string;
  counterpart?: RoomMember; // when type === "dialog"
};

export const eventRoomToRoom = (e: EventRoom, ourUserId: string) => {
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

  React.useLayoutEffect(() => {
    // Clear roster when user's token is changed
    setRawRoster(() => []);
    setRosterLoaded(false);
    setOldestRoomTs(Infinity);
    setSeenRoster(() => ({}));
    setBadges(() => ({}));
    setBadgesLoaded(false);
    setBadgesPrevCursor(undefined);
    setCustomers([]);
  }, [token]);

  const roomById = React.useCallback((id: string) => rawRoster.find(r => r.id === id), [rawRoster]);
  const roomByName = React.useCallback((name: string) => rawRoster.find(r => r.name === name), [
    rawRoster,
  ]);

  const updateBadge = React.useCallback(
    (b: EventBadge) => {
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
            if (!room.remove) {
              newRoster = newRoster.filter(x => room.id !== x.id);
              newRoster.push(eventRoomToRoom(room, userId));
            }
          });
          return newRoster;
        });
      }
    },
    [userId]
  );

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
    if (!rosterLoaded) {
      const topic = workspaceId ? `workspace/${workspaceId}/rooms` : `helpdesk/${helpdeskId}/rooms`;
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        topic,
        before: oldestRoomTs,
      }).then(x => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          const items = extractEventRoom(x.items);
          updateRoster(items);
          setOldestRoomTs(Math.min(...items.map(x => x.createdTs), oldestRoomTs || Infinity));
          if (items.length === 0) {
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

  const updateCustomers = React.useCallback(
    (customersIn: EventCustomer[]) => {
      let newCustomers = customers;
      if (customersIn) {
        customersIn.forEach(customer => {
          newCustomers = newCustomers.filter(x => customer.id !== x.id);
          newCustomers.push(customer);
        });
        newCustomers.sort((a, b) => b.updatedTs - a.updatedTs);
        setCustomers(newCustomers);
      }
    },
    [customers]
  );

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (!workspaceId || customersLoaded) {
      return;
    }
    serverCall({
      msgType: "Stream.Get",
      topic: `workspace/${workspaceId}/customers`,
    }).then(x => {
      console.assert(x.msgType === "Stream.GetOk");
      if (x.msgType === "Stream.GetOk") {
        updateCustomers(extractEventCustomer(x.items));
      }
    });
    serverCall({
      msgType: "Stream.Sub",
      topic: `workspace/${workspaceId}/customers`,
    }).then(x => {
      console.assert(x.msgType === "Stream.SubOk");
    });
    setCustomersLoaded(true);
  }, [fogSessionId, workspaceId, updateCustomers, serverCall]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Room") {
      updateRoster([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Badge") {
      updateBadge(lastIncomingMessage);
    } else if (lastIncomingMessage?.msgType === "Event.Customer") {
      updateCustomers([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Seen") {
      setSeenRoster(r => ({ ...r, [lastIncomingMessage.roomId]: lastIncomingMessage }));
    }
  }, [lastIncomingMessage, updateRoster, updateBadge]);

  const roster = React.useMemo(() => {
    return rawRoster
      .concat()
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
  }, [rawRoster, badges]);

  return {
    roster,
    roomById,
    roomByName,
    badges,
    customers,
    seenRoster,
    setSeenRoster,
  };
};
