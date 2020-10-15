import {
  AnyToken,
  EventAgent,
  EventBadge,
  EventCustomer,
  EventMessage,
  EventNotificationMessage,
  EventRoom,
  EventTyping,
  File,
  MessageCreate,
  MessageLink,
  MessageOk,
  RoomOk,
  SearchOk,
  StreamGetOk,
  StreamSubOk,
  StreamUnSubOk,
} from "../schema";
import throttle from "lodash.throttle";
import React from "react";
import { atom } from "jotai";
import { useImmerAtom } from "jotai/immer";

import { Env } from "../config";
import { useLoadAround } from "./loadAround";
import { useServerWs } from "../useServerWs";

export type Message = {
  id: string;
  author: {
    id: string;
    name: string;
    type: "agent" | "user";
    avatarUrl?: string;
    isAgent?: boolean;
  };
  createdTs: number;
  updatedTs: number;
  parsed: string;
  files: File[];
  roomId: string;
  isPinned?: boolean;
  tags?: string[];
  links?: MessageLink[];
  linkRoomId?: string;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
  linkType?: "forward" | "reply";
  deletedTs?: number;
  deletedByName?: string;
};

export type WsContext = ReturnType<typeof useProviderValue>;

const WsContext = React.createContext<WsContext | undefined>(undefined);
WsContext.displayName = "WsContext";

function useProviderValue(token: AnyToken | undefined, env?: Env) {
  const [fogSessionId, setFogSessionId] = React.useState<string>();
  const [userId, setUserId] = React.useState<string>();
  const [helpdeskId, setHelpdeskId] = React.useState<string>();
  const client = React.useMemo(
    () =>
      new (class HelpWidgetClient {
        setSession(sessionId: string, userId: string, helpdeskId: string) {
          setFogSessionId(sessionId);
          setUserId(userId);
          setHelpdeskId(helpdeskId);
        }
      })(),
    []
  );
  const value = useServerWs(client, token, env);
  return { ...value, token, fogSessionId, userId, helpdeskId };
}

export const WsProvider: React.FC<{
  token: AnyToken | undefined;
  env?: Env;
  children?: React.ReactNode;
}> = ({ token, env, ...props }) => {
  const value = useProviderValue(token, env);
  return <WsContext.Provider value={value} {...props} />;
};

export function useWs() {
  const context = React.useContext(WsContext);
  if (context === undefined) {
    throw new Error(`useWs must be used within a WsProvider`);
  }
  return context;
}

export const nameMatchesFilter = (name: string, filter: string) =>
  [name].concat(name.split(/[\s-]+/)).some(s => s.toLowerCase().startsWith(filter));

export const useRoster = ({
  workspaceId,
  helpdeskId,
}: {
  workspaceId?: string;
  helpdeskId?: string;
}) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const { fogSessionId, serverCall, lastIncomingMessage } = useWs();

  const roomsRef = React.useRef<EventRoom[]>([]);
  const rooms = roomsRef.current;

  const roomById = React.useCallback((id: string) => roomsRef.current.find(r => r.id === id), []);

  const [rosterFilter, setRosterFilter] = React.useState<string>();

  const [filteredRooms, setFilteredRooms] = useImmer<EventRoom[]>([]);

  const updateRoster = React.useCallback((roomsIn: EventRoom[]) => {
    let newRoster = roomsRef.current;
    roomsIn.forEach(room => {
      newRoster = newRoster.filter(x => room.id !== x.id);
      newRoster.push(room);
    });
    // TODO: convert ts to milliseconds from microseconds
    newRoster.sort((a, b) => b.updatedTs - a.updatedTs);
    roomsRef.current = newRoster;
    forceUpdate();
  }, []);

  const [rosterLoaded, setRosterLoaded] = React.useState(false);
  const [oldestRoomTs, setOldestRoomTs] = React.useState<number>(Infinity);

  React.useEffect(() => {
    if (!workspaceId && !helpdeskId) {
      return;
    }
    if (fogSessionId && !rosterLoaded) {
      const topic = workspaceId ? `workspace/${workspaceId}/rooms` : `helpdesk/${helpdeskId}/rooms`;
      serverCall({
        msgType: "Stream.Sub",
        topic,
        before: oldestRoomTs,
      }).then((x: StreamSubOk<EventRoom>) => {
        console.assert(x.msgType === "Stream.SubOk");

        if (x.msgType === "Stream.SubOk") {
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
      });
    }
  }, [oldestRoomTs, rosterLoaded, fogSessionId, serverCall, workspaceId, helpdeskId, updateRoster]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Room") {
      updateRoster([lastIncomingMessage]);
    }
  }, [lastIncomingMessage, updateRoster]);

  const createRoom = React.useCallback(
    params =>
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
        setFilteredRooms(y => {
          y.length = 0;
          x.items.forEach(r => {
            if (r.msgType === "Event.Room") {
              y.push(r);
            }
          });
        });
      });
    } else if (!rosterFilter) {
      setFilteredRooms(x => {
        x.length = 0;
        rooms.forEach(r => {
          x.push(r);
        });
      });
    }
  }, [rooms, customers, rosterFilter, serverCall]);

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

const useHistoryStore = () => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const messagesByTargetRef = React.useRef<{ [targetMessageId: string]: Message[] }>({});

  const convertEventMessageToMessage = React.useCallback(
    (message: EventMessage): Message => ({
      id: message.id,
      author: {
        id: message.fromId,
        name: message.fromName,
        type: message.fromType,
        avatarUrl: message.fromAvatarUrl,
      },
      createdTs: message.createdTs || Date.now() * 1000,
      updatedTs: message.updatedTs || Date.now() * 1000,
      parsed: message.text,
      files: message.files,
      roomId: message.roomId,
      links: message.links,
      linkRoomId: message.linkRoomId,
      linkStartMessageId: message.linkStartMessageId,
      linkEndMessageId: message.linkEndMessageId,
      linkType: message.linkType,
      deletedTs: message.deletedTs,
      deletedByName: message.deletedByName,
    }),
    []
  );

  const latestMessages = React.useRef<Message[]>([]);
  const aroundMessages = React.useRef<Message[]>([]);

  const newerHistoryComplete = React.useRef(false);
  const setNewerHistoryComplete = React.useCallback((isComplete: boolean) => {
    if (newerHistoryComplete.current !== isComplete) {
      newerHistoryComplete.current = isComplete;
      forceUpdate();
    }
  }, []);

  const historyMode = React.useRef<"latest" | "around">("latest");
  const setHistoryMode = React.useCallback(
    (mode: "latest" | "around") => {
      if (historyMode.current !== mode) {
        historyMode.current = mode;
        forceUpdate();
      }
      if (historyMode.current === "latest") {
        aroundMessages.current = [];
        setNewerHistoryComplete(true);
      }
    },
    [setNewerHistoryComplete]
  );

  const clearLatestHistory = React.useCallback(() => {
    latestMessages.current = [];
  }, []);
  const clearAroundHistory = React.useCallback(() => {
    aroundMessages.current = [];
  }, []);

  const dedupAndSort = React.useCallback(
    (messages: Message[]) =>
      messages
        .filter((message1, i) => messages.findIndex(message2 => message1.id === message2.id) === i)
        .sort((x, y) => x.createdTs - y.createdTs),
    []
  );

  const addMessages = React.useCallback(
    (messagesIn: EventMessage[], type: "event" | "page") => {
      if (messagesIn.length === 0) {
        return;
      }
      messagesIn.map(convertEventMessageToMessage).forEach(message => {
        const isUpdate =
          message.updatedTs > message.createdTs ||
          latestMessages.current.concat(aroundMessages.current).find(m => m.id === message.id);
        if (type === "event" && isUpdate) {
          const update = (acc: Message[], m: Message) =>
            m.id === message.id ? acc.concat(message) : acc.concat(m);
          latestMessages.current = latestMessages.current.reduce(update, []);
          aroundMessages.current = aroundMessages.current.reduce(update, []);
        } else if (type === "event") {
          latestMessages.current = dedupAndSort(latestMessages.current.concat(message));
        } else if (type === "page" && historyMode.current === "latest") {
          latestMessages.current = dedupAndSort(latestMessages.current.concat(message));
        } else if (type === "page" && historyMode.current === "around") {
          aroundMessages.current = dedupAndSort(aroundMessages.current.concat(message));
        }
      });
      // When in "around" mode, check for intersection in `around` and `latest` lists
      // If there is, then combine and reset to "latest" mode
      if (
        historyMode.current === "around" &&
        aroundMessages.current.some(x => latestMessages.current.find(y => x.id === y.id))
      ) {
        latestMessages.current = dedupAndSort(
          latestMessages.current.concat(aroundMessages.current)
        );
        aroundMessages.current = [];
        setHistoryMode("latest");
      }
      forceUpdate();
    },
    [convertEventMessageToMessage, dedupAndSort, setHistoryMode]
  );

  const expandLink = React.useCallback((targetMessageId: string, messages: EventMessage[]) => {
    const messagesByTarget = messagesByTargetRef.current;

    messages.forEach(message => {
      const {
        id,
        roomId,
        fromId,
        fromName,
        fromAvatarUrl,
        fromType,
        text,
        files,
        createdTs,
        updatedTs,
      } = message;

      if (!messagesByTarget[targetMessageId]) {
        messagesByTarget[targetMessageId] = [];
      }

      messagesByTarget[targetMessageId] = messagesByTarget[targetMessageId].filter(
        x => id !== x.id
      );
      messagesByTarget[targetMessageId].push({
        id,
        author: { id: fromId, name: fromName, type: fromType, avatarUrl: fromAvatarUrl },
        createdTs: createdTs || Date.now(),
        updatedTs: updatedTs || Date.now(),
        parsed: text,
        files,
        roomId,
      });
    });

    if (messagesByTarget[targetMessageId]) {
      messagesByTarget[targetMessageId].sort((x, y) => x.createdTs - y.createdTs);
    }
  }, []);

  return {
    messages: historyMode.current === "latest" ? latestMessages.current : aroundMessages.current,
    addMessages,
    setHistoryMode,
    clearLatestHistory,
    clearAroundHistory,
    newerHistoryComplete: newerHistoryComplete.current,
    setNewerHistoryComplete,
    messagesByTarget: messagesByTargetRef.current,
    expandLink,
  };
};

export const useRoomHistory = ({
  userId,
  roomId,
  aroundId,
  isIdle,
}: {
  userId: string | undefined;
  roomId: string;
  aroundId: string | undefined;
  isIdle: boolean;
}) => {
  const { token, fogSessionId, serverCall, lastIncomingMessage } = useWs();

  const {
    messages,
    addMessages,
    setHistoryMode,
    clearLatestHistory,
    clearAroundHistory,
    newerHistoryComplete,
    setNewerHistoryComplete,
    messagesByTarget,
    expandLink,
  } = useHistoryStore();

  const { updateLoadAround } = useLoadAround();

  const processAndStoreMessages = React.useCallback(
    async (messagesIn: EventMessage[], from: "event" | "page") => {
      const resolveLinkTargets: Promise<void>[] = [];

      messagesIn.forEach(message => {
        const { id, linkRoomId, linkStartMessageId, linkEndMessageId, linkType } = message;
        if (linkRoomId && linkStartMessageId && linkEndMessageId && linkType) {
          resolveLinkTargets.push(
            serverCall({
              msgType: "Stream.Get",
              topic: `room/${linkRoomId}/messages`,
              startId: linkStartMessageId,
              endId: linkEndMessageId,
            }).then((x: StreamGetOk<EventMessage>) => {
              console.assert(x.msgType === "Stream.GetOk");
              if (x.msgType === "Stream.GetOk") {
                expandLink(id, x.items);
              }
            })
          );
        }
      });

      return Promise.all(resolveLinkTargets).then(() => addMessages(messagesIn, from));
    },
    [addMessages, expandLink, serverCall]
  );

  const [subscribed, setSubscribed] = React.useState(false);
  const [subscribing, setSubscribing] = React.useState(false);
  React.useEffect(() => {
    if (subscribed || subscribing) {
      return;
    }
    setSubscribing(true);
    serverCall({
      msgType: "Stream.Sub",
      topic: `room/${roomId}/messages`,
    }).then(async x => {
      console.assert(x.msgType === "Stream.SubOk");
    });
    serverCall({
      msgType: "Stream.Get",
      topic: `room/${roomId}/messages`,
    }).then(async x => {
      console.assert(x.msgType === "Stream.GetOk");
      if (x.msgType === "Stream.GetOk") {
        await processAndStoreMessages(x.items as EventMessage[], "page");
        setNewerHistoryComplete(true);
        setSubscribed(true);
        setSubscribing(false);
      }
    });
  }, [
    roomId,
    subscribed,
    subscribing,
    processAndStoreMessages,
    setNewerHistoryComplete,
    serverCall,
  ]);

  const [fetchingOlder, setFetchingOlder] = React.useState(false);
  const [olderHistoryComplete, setOlderHistoryComplete] = React.useState(false);

  const fetchOlderPage = React.useCallback(
    ts => {
      setFetchingOlder(true);
      serverCall({
        msgType: "Stream.Get",
        topic: `room/${roomId}/messages`,
        before: ts,
      }).then(async (x: StreamGetOk<EventMessage>) => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          await processAndStoreMessages(x.items as EventMessage[], "page");
          if (x.items.length === 0 || x.items.every(x => messages.find(m => m.id === x.id))) {
            setOlderHistoryComplete(true);
          }
          setFetchingOlder(false);
        }
      });
    },
    [roomId, messages, serverCall, processAndStoreMessages]
  );

  const [fetchingNewer, setFetchingNewer] = React.useState(false);

  const fetchNewerPage = React.useCallback(
    ts => {
      setFetchingNewer(true);
      serverCall({
        msgType: "Stream.Get",
        topic: `room/${roomId}/messages`,
        since: ts,
      }).then(async (x: StreamGetOk<EventMessage>) => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          await processAndStoreMessages(x.items as EventMessage[], "page");
          setFetchingNewer(false);
        }
      });
    },
    [roomId, serverCall, processAndStoreMessages]
  );

  const [isAroundFetched, setIsAroundFetched] = React.useState(false);
  const [isAroundFetching, setIsAroundFetching] = React.useState(false);

  const fetchPageAroundId = React.useCallback(
    (aroundId: string) => {
      setIsAroundFetching(true);
      setIsAroundFetched(false);
      serverCall({
        msgType: "Stream.Get",
        topic: `room/${roomId}/messages`,
        aroundId,
      }).then(async (x: StreamGetOk<EventMessage>) => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          setHistoryMode("around");
          await processAndStoreMessages(x.items as EventMessage[], "page");
          setIsAroundFetched(true);
          setIsAroundFetching(false);
        }
      });
    },
    [roomId, serverCall, processAndStoreMessages, setHistoryMode]
  );

  const resetHistoryToLastPage = React.useCallback(() => {
    setHistoryMode("latest");
    setOlderHistoryComplete(false);
    setIsAroundFetched(false);
    setIsAroundFetching(false);
    updateLoadAround(roomId, undefined);
  }, [roomId, setHistoryMode, updateLoadAround]);

  React.useLayoutEffect(() => {
    setIsAroundFetched(false);
    setIsAroundFetching(false);
  }, [aroundId]);

  React.useLayoutEffect(() => {
    if (!fogSessionId || !subscribed) {
      return;
    }
    if (aroundId && messages.find(x => x.id === aroundId)) {
      setIsAroundFetched(true);
      setIsAroundFetching(false);
    } else if (aroundId && !isAroundFetching && !isAroundFetched) {
      clearAroundHistory();
      setOlderHistoryComplete(false);
      setNewerHistoryComplete(false);
      fetchPageAroundId(aroundId);
    }
  }, [
    fogSessionId,
    subscribed,
    aroundId,
    messages,
    isAroundFetching,
    isAroundFetched,
    fetchPageAroundId,
    clearAroundHistory,
    setNewerHistoryComplete,
  ]);

  const [seenUpToMessageId, setSeenUpToMessageId] = React.useState<"initial" | string | undefined>(
    "initial"
  );

  const onSeen = React.useCallback(
    (messageId: string) => {
      if (
        messageId &&
        !isIdle &&
        seenUpToMessageId !== "initial" &&
        (!seenUpToMessageId || messageId > seenUpToMessageId)
      ) {
        setSeenUpToMessageId(messageId);

        // XXX TODO: this gets called twice
        serverCall({
          msgType: "Message.Seen",
          roomId,
          messageId,
        }).then((x: MessageOk) => {
          console.assert(x.msgType === "Message.Ok");
        });
      }
    },
    [isIdle, roomId, serverCall, seenUpToMessageId]
  );

  React.useEffect(() => {
    if (
      lastIncomingMessage?.msgType === "Event.Message" &&
      lastIncomingMessage?.roomId === roomId
    ) {
      if (lastIncomingMessage.fromId === userId) {
        onSeen(lastIncomingMessage.id);
      }
      processAndStoreMessages([lastIncomingMessage], "event");
    } else if (
      lastIncomingMessage?.msgType === "Event.Seen" &&
      lastIncomingMessage?.roomId === roomId
    ) {
      setSeenUpToMessageId(lastIncomingMessage.messageId);
    }
  }, [onSeen, userId, roomId, lastIncomingMessage, processAndStoreMessages]);

  React.useEffect(() => {
    if (token && userId && userId.startsWith("a")) {
      // TODO maybe there's a better way to tell users and agents apart?
      serverCall({
        msgType: "Stream.Sub",
        topic: `agent/${userId}/seen`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });

      serverCall({
        msgType: "Stream.Get",
        topic: `agent/${userId}/seen`,
      }).then(x => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          const seen = x.items.find(s => s.msgType === "Event.Seen" && s.roomId === roomId);

          if (seen && seen.msgType === "Event.Seen") {
            setSeenUpToMessageId(seen.messageId);
          } else {
            setSeenUpToMessageId(undefined);
          }
        }
      });
    }
  }, [roomId, token, userId, serverCall]);

  const messageCreate = React.useCallback(
    (args: MessageCreate) => {
      serverCall(args).then(x => {
        console.assert(x.msgType === "Message.Ok");
        if (args.roomId === roomId) {
          setSeenUpToMessageId(x.messageId);
        }
      });
    },
    [roomId, serverCall]
  );

  React.useEffect(() => {
    return () => {
      clearLatestHistory();
      clearAroundHistory();
      serverCall({
        msgType: "Stream.UnSub",
        topic: `room/${roomId}/typing`,
      }).then((x: StreamUnSubOk) => {
        console.assert(x.msgType === "Stream.UnSubOk");
      });
      serverCall({
        msgType: "Stream.UnSub",
        topic: `room/${roomId}/messages`,
      }).then((x: StreamUnSubOk) => {
        console.assert(x.msgType === "Stream.UnSubOk");
        setSubscribed(false);
        setSubscribing(false);
      });
    };
  }, [roomId, clearLatestHistory, clearAroundHistory, serverCall]);

  return {
    messages,
    fetchOlderPage,
    fetchingOlder,
    olderHistoryComplete,
    fetchNewerPage,
    fetchingNewer,
    newerHistoryComplete,
    isAroundFetched,
    isAroundFetching,
    resetHistoryToLastPage,
    serverCall,
    messagesByTarget,
    onSeen,
    seenUpToMessageId,
    messageCreate,
  };
};

export const useRoomTyping = ({
  userId,
  roomId,
}: {
  userId: string | undefined;
  roomId: string;
}) => {
  const { serverCall, lastIncomingMessage } = useWs();

  const [typingNames, setTypingNames] = React.useState<string>();

  const processTypingEvent = React.useCallback(
    (event: EventTyping) => {
      if (event.roomId !== roomId) {
        return;
      }
      const newTypingNames = event.data
        .filter(u => u.id !== userId)
        .map(u => u.name.split(" ")[0])
        .join(", ");
      setTypingNames(newTypingNames || undefined);
    },
    [userId, roomId]
  );

  React.useEffect(() => {
    serverCall({
      msgType: "Stream.Sub",
      topic: `room/${roomId}/typing`,
    }).then(x => {
      console.assert(x.msgType === "Stream.SubOk");
      if (x.msgType === "Stream.SubOk" && x.items[0]?.msgType === "Event.Typing") {
        processTypingEvent(x.items[0]);
      }
    });
  }, [roomId, serverCall, processTypingEvent]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Typing") {
      processTypingEvent(lastIncomingMessage);
    }
  }, [lastIncomingMessage, processTypingEvent]);

  const updateTyping: () => void = React.useCallback(
    throttle(
      () =>
        serverCall({
          msgType: "Typing.Set",
          roomId,
        }),
      1000
    ),
    [roomId, serverCall]
  );

  return { typingNames, updateTyping };
};
function useImmer<T>(initialValue: T) {
  return useImmerAtom(React.useRef(atom(initialValue)).current);
}

export const useNotifications = ({
  vendorId,
  workspaceId,
  userId,
}: {
  vendorId: string;
  workspaceId: string;
  userId: string | undefined;
}) => {
  const { token, serverCall, lastIncomingMessage } = useWs();
  const [badges, setBadges] = useImmer<{ [roomId: string]: EventBadge }>({});
  const [notification, setNotification] = React.useState<EventNotificationMessage>();

  const [agents, setAgents] = useImmer<EventAgent[]>([]);

  const updateAgent = React.useCallback(
    (a: EventAgent) => {
      setAgents(x => {
        const index = x.findIndex(y => y.id === a.id);
        if (index !== -1) {
          if (!a.deletedById) {
            x[index] = a;
          } else {
            x.splice(index, 1);
          }
        } else {
          x.push(a);
        }
      });
    },
    [setAgents]
  );

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
    if (token && userId && userId.startsWith("a")) {
      serverCall({
        msgType: "Stream.Get",
        topic: `agent/${userId}/badges`,
      }).then(x => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          x.items.forEach(b => {
            if (b.msgType === "Event.Badge") {
              updateBadge(b);
            }
          });
        }
      });
      serverCall({
        msgType: "Stream.Sub",
        topic: `agent/${userId}/badges`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });

      /*
      serverCall({
        msgType: "Stream.Get",
        topic: `agent/${userId}/agents`,
      }).then(x => {
        console.assert(x.msgType === "Stream.GetOk");
        x.items.forEach(a => {
          if (a.msgType === "Event.Agent") {
            updateAgent(a);
          }
        });
      });
      serverCall({
        msgType: "Stream.Sub",
        topic: `agent/${userId}/agents`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
      */

      serverCall({
        msgType: "Stream.Sub",
        topic: `agent/${userId}/seen`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });

      serverCall({
        msgType: "Stream.Sub",
        topic: `agent/${userId}/notifications`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [updateAgent, updateBadge, token, workspaceId, vendorId, userId, serverCall]);

  React.useEffect(() => {
    if (lastIncomingMessage?.msgType === "Event.Notification.Message") {
      setNotification(lastIncomingMessage);
    } else if (lastIncomingMessage?.msgType === "Event.Badge") {
      updateBadge(lastIncomingMessage);
    }
  }, [updateBadge, setNotification, lastIncomingMessage]);

  return { agents, badges, notification };
};
