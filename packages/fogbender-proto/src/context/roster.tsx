import { atom, useAtom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import {
  EventBadge,
  EventCustomer,
  EventRoom,
  EventSeen,
  EventTag,
  IntegrationCreateIssue,
  IntegrationForwardToIssue,
  RoomCreate,
  RoomMember,
  RoomUpdate,
  SearchRoster,
  StreamGet,
  StreamSub,
} from "../schema";

import { useWs } from "./ws";

import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";
import {
  extractEventBadge,
  extractEventCustomer,
  extractEventRoom,
  extractEventSeen,
  extractEventTag,
} from "../utils/castTypes";

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

export const useRoster = ({
  workspaceId,
  helpdeskId,
  userId,
  roomId, // for mentions
}: {
  workspaceId?: string;
  helpdeskId?: string;
  userId?: string;
  roomId?: string;
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

  React.useEffect(() => {
    // Clear roster on user logout
    if (token === undefined && isMainHook) {
      setRawRoster(() => []);
      setRosterLoaded(false);
      setOldestRoomTs(Infinity);
      setSeenRoster(() => ({}));
      setBadges(() => ({}));
      setBadgesLoaded(false);
      setBadgesPrevCursor(undefined);
      setCustomers([]);
    }
  }, [isMainHook, token]);

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

  /*
    API calls work independently for each hook
  */

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
        | "meta"
      >
    ) =>
      serverCall<RoomCreate>({
        msgType: "Room.Create",
        name: params.name,
        type: params.type,
        members: params.members,
        helpdeskId: params.helpdeskId,
        tags: params.tags,
        meta: params.meta,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then(x => {
        console.assert(x.msgType === "Room.Ok");
        setSeenRoster(roster => ({ ...roster, [Date.now() * 1000]: x }));
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
      serverCall<RoomUpdate>({
        msgType: "Room.Update",
        roomId: params.roomId,
        name: params.name,
        membersToAdd: params.membersToAdd,
        membersToRemove: params.membersToRemove,
        tagsToAdd: params.tagsToAdd,
        tagsToRemove: params.tagsToRemove,
      }).then(x => {
        console.assert(x.msgType === "Room.Ok");
        return x;
      }),
    [serverCall]
  );

  const createIssue = React.useCallback(
    (
      params: Pick<
        IntegrationCreateIssue,
        "integrationId" | "title" | "linkRoomId" | "linkStartMessageId" | "linkEndMessageId"
      >
    ) =>
      serverCall<IntegrationCreateIssue>({
        msgType: "Integration.CreateIssue",
        integrationId: params.integrationId,
        title: params.title,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then(x => {
        console.assert(x.msgType === "Integration.Ok");
        return x;
      }),
    [serverCall]
  );

  const forwardToIssue = React.useCallback(
    (
      params: Pick<
        IntegrationForwardToIssue,
        "integrationId" | "gid" | "linkRoomId" | "linkStartMessageId" | "linkEndMessageId"
      >
    ) =>
      serverCall<IntegrationForwardToIssue>({
        msgType: "Integration.ForwardToIssue",
        integrationId: params.integrationId,
        gid: params.gid,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then(x => {
        console.assert(x.msgType === "Integration.Ok");
        return x;
      }),
    [serverCall]
  );

  /*
    Search roster -- works independently for each hook
  */

  const [rosterFilter, setRosterFilter] = React.useState<string>();
  const [filteredRoster, setFilteredRoster] = React.useState([] as Room[]);
  const filteredRooms = React.useMemo(() => filteredRoster.filter(x => x.type !== "dialog"), [
    filteredRoster,
  ]);
  const filteredDialogs = React.useMemo(() => filteredRoster.filter(x => x.type === "dialog"), [
    filteredRoster,
  ]);

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

  React.useEffect(() => {
    if (userId && roomId && rosterFilter !== undefined) {
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        workspaceId,
        helpdeskId,
        mentionRoomId: roomId,
        term: rosterFilter,
        type: "dialog",
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && workspaceId && rosterFilter) {
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        workspaceId,
        term: rosterFilter,
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && helpdeskId && rosterFilter) {
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        helpdeskId,
        term: rosterFilter,
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && !rosterFilter) {
      setFilteredRoster(filterNotMonolog(roster.map(y => eventRoomToRoom(y, userId))));
    }
  }, [userId, roster, customers, rosterFilter, serverCall]);

  return {
    roster,
    seenRoster,
    roomById,
    roomByName,
    filteredRoster,
    filteredRooms,
    filteredDialogs,
    setRosterFilter,
    createRoom,
    updateRoom,
    createIssue,
    forwardToIssue,
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
        .then(x => {
          if (x.msgType !== "Search.Ok") {
            throw x;
          }
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
  const { token, serverCall, lastIncomingMessage, helpdesk } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();

  const [tags, setTags] = React.useState<{ id: string; name: string }[]>([]);

  const updateTags = React.useCallback(
    (tagsIn: EventTag[]) => {
      let newTags = tags;
      tagsIn.forEach(tag => {
        newTags = newTags.filter(x => x.id !== tag.id);
        if (!tag.remove) {
          newTags.push({ id: tag.id, name: tag.name });
        }
      });
      setTags(newTags);
    },
    [tags]
  );

  React.useEffect(() => {
    if (userId && lastIncomingMessage?.msgType === "Event.Tag") {
      updateTags([lastIncomingMessage]);
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
          if (x.msgType !== "Stream.GetOk") {
            throw x;
          }
          updateTags(extractEventTag(x.items));
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

  React.useEffect(() => {
    return () => {
      if (userId && userId.startsWith("u") && token) {
        serverCall({
          msgType: "Stream.UnSub",
          topic: `user/${userId}/tags`,
        }).then(x => {
          console.assert(x.msgType === "Stream.UnSubOk");
        });
      }
    };
  }, [userId, serverCall]);

  return { tags, helpdeskTags: helpdesk?.tags || [] };
};
