import { atom, useAtom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import {
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

import { useWs } from "./ws";

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

const mainRosterHookIdAtom = atom<string | undefined>(undefined);
const rosterAtom = atom<Room[]>([]);
const rosterLoadedAtom = atom(false);
const oldestRoomTsAtom = atom(Infinity);
const seenRosterAtom = atom<{ [key: string]: EventSeen }>({});
const badgesAtom = atom<{ [key: string]: EventBadge }>({});
const badgesLoadedAtom = atom(false);
const badgesPrevCursorAtom = atom<string | undefined>(undefined);
const customersAtom = atom<EventCustomer[]>([]);
const customersLoadedAtom = atom(false);

export const useSharedRoster = ({
  workspaceId,
  helpdeskId,
  userId,
}: {
  workspaceId?: string;
  helpdeskId?: string;
  userId?: string;
}) => {
  const { token, fogSessionId, serverCall, lastIncomingMessage } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();

  /*
    Shared state, should be same for every hook

    Because retrieving and updating this shared state involves many conditional async requests,
    it's quite hard to move it to jotai's get/set atoms.

    But repeating them for every hook's instance is a great waste of cpu time on both ends.

    To cut around this, every hook generates it's own id, and one of the hooks is assigned as main
    (i.e. its id is stored in jotai's state). Then, only main instance operates on shared state.

    If main hook is unmounted, then next one is assigned as main.

    A better idea might be to split one useRoster to useGlobalRoster and useSearchRoster,
    and allow calling useGlobalRoster only once.
  */

  const [mainRosterHookId, setMainRosterHookId] = useAtom(mainRosterHookIdAtom);

  const [rosterHookId] = React.useState(() => Math.random().toString(36).substring(7));

  React.useLayoutEffect(() => {
    if (mainRosterHookId === undefined) {
      setMainRosterHookId(rosterHookId);
    }
    return () => {
      if (mainRosterHookId === rosterHookId) {
        setMainRosterHookId(undefined);
      }
    };
  }, [rosterHookId, mainRosterHookId]);

  const isMainHook = rosterHookId === mainRosterHookId;

  const [rawRoster, setRawRoster] = useImmerAtom(rosterAtom);
  const [rosterLoaded, setRosterLoaded] = useAtom(rosterLoadedAtom);
  const [oldestRoomTs, setOldestRoomTs] = useAtom(oldestRoomTsAtom);
  const [seenRoster, setSeenRoster] = useImmerAtom(seenRosterAtom);
  const [badges, setBadges] = useImmerAtom(badgesAtom);
  const [badgesLoaded, setBadgesLoaded] = useAtom(badgesLoadedAtom);
  const [badgesPrevCursor, setBadgesPrevCursor] = useAtom(badgesPrevCursorAtom);
  const [customers, setCustomers] = useAtom(customersAtom);
  const [customersLoaded, setCustomersLoaded] = useAtom(customersLoadedAtom);

  React.useLayoutEffect(() => {
    // Clear roster when user's token is changed
    if (isMainHook) {
      console.log("clear roster");
      setRawRoster(() => []);
      setRosterLoaded(false);
      setOldestRoomTs(Infinity);
      setSeenRoster(() => ({}));
      setBadges(() => ({}));
      setBadgesLoaded(false);
      setBadgesPrevCursor(undefined);
      setCustomers([]);
    }
  }, [token, isMainHook]);

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
    if (!fogSessionId || !isMainHook) {
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
  }, [fogSessionId, isMainHook, userId, serverCall]);

  React.useEffect(() => {
    if (!fogSessionId || !isMainHook) {
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
            setBadgesPrevCursor(x.prev || undefined);
            if (items.length === 0) {
              setBadgesLoaded(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [fogSessionId, isMainHook, userId, badgesPrevCursor, badgesLoaded, updateBadge, serverCall]);

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
    if (!fogSessionId || !isMainHook) {
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
  }, [fogSessionId, isMainHook, workspaceId, helpdeskId]);

  React.useEffect(() => {
    if (!fogSessionId || !isMainHook) {
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
  }, [
    fogSessionId,
    isMainHook,
    oldestRoomTs,
    rosterLoaded,
    serverCall,
    workspaceId,
    helpdeskId,
    updateRoster,
  ]);

  React.useEffect(() => {
    if (!fogSessionId || !isMainHook) {
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
  }, [fogSessionId, isMainHook, userId, serverCall]);

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
    if (!fogSessionId || !isMainHook) {
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
  }, [fogSessionId, isMainHook, workspaceId, updateCustomers, serverCall]);

  React.useEffect(() => {
    if (!isMainHook) {
      return;
    }
    if (lastIncomingMessage?.msgType === "Event.Room") {
      updateRoster([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Badge") {
      updateBadge(lastIncomingMessage);
    } else if (lastIncomingMessage?.msgType === "Event.Customer") {
      updateCustomers([lastIncomingMessage]);
    } else if (lastIncomingMessage?.msgType === "Event.Seen") {
      setSeenRoster(r => ({ ...r, [lastIncomingMessage.roomId]: lastIncomingMessage }));
    }
  }, [isMainHook, lastIncomingMessage, updateRoster, updateBadge]);

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
