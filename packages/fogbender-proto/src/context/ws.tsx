import {
  AnyToken,
  EventAgent,
  EventIssue,
  EventMessage,
  EventNotificationMessage,
  EventTyping,
  File,
  MessageCreate,
  MessageUpdate,
  MessageSeen,
  MessageUnseen,
  MentionIn,
  Reaction,
  StreamGet,
  StreamSub,
  TagCreate,
  TagUpdate,
  TagDelete,
} from "../schema";
import throttle from "lodash.throttle";
import { atom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import { useLoadAround } from "./loadAround";
import { useSharedRoster } from "./sharedRoster";
import { useServerWs } from "../useServerWs";
import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";
import { Client } from "../client";
import { extractEventMessage, extractEventSeen, extractEventTyping } from "../utils/castTypes";

export type Author = {
  id: string;
  name: string;
  type: "agent" | "user";
  avatarUrl?: string;
};

export type Message = {
  id: string;
  clientId: string;
  author: Author;
  createdTs: number;
  updatedTs: number;
  parsed: string;
  rawText: string;
  plainText?: string;
  mentions?: MentionIn[];
  reactions?: Reaction[];
  files: File[];
  roomId: string;
  isPinned?: boolean;
  tags?: string[];
  linkRoomId?: string;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
  linkType?: "forward" | "reply";
  targets?: Message[];
  sources?: Message[];
  deletedTs?: number;
  deletedByName?: string;
  editedTs?: number;
  editedByName?: string;
};

const convertEventMessageToMessage = (message: EventMessage): Message => ({
  id: message.id,
  clientId: message.clientId,
  author: {
    id: message.fromId,
    name: message.fromName,
    type: message.fromType,
    avatarUrl: message.fromAvatarUrl,
  },
  createdTs: message.createdTs || Date.now() * 1000,
  updatedTs: message.updatedTs || Date.now() * 1000,
  parsed: message.text,
  rawText: message.rawText,
  plainText: message.plainText,
  mentions: message.mentions,
  reactions: message.reactions,
  files: message.files,
  roomId: message.roomId,
  linkRoomId: message.linkRoomId,
  linkStartMessageId: message.linkStartMessageId,
  linkEndMessageId: message.linkEndMessageId,
  linkType: message.linkType,
  targets: message.targets?.map(convertEventMessageToMessage),
  sources: message.sources?.map(convertEventMessageToMessage),
  deletedTs: message.deletedTs,
  deletedByName: message.deletedByName,
  editedTs: message.editedTs,
  editedByName: message.editedByName,
});

export type WsContext = ReturnType<typeof useProviderValue>;

const WsContext = React.createContext<WsContext | undefined>(undefined);
WsContext.displayName = "WsContext";

function useProviderValue(
  token: AnyToken | undefined,
  workspaceId?: string,
  client?: Client,
  isIdle?: boolean,
  suspendConnection?: boolean
) {
  const [fogSessionId, setFogSessionId] = React.useState<string>();
  const [userId, setUserId] = React.useState<string>();
  const [helpdeskId, setHelpdeskId] = React.useState<string>();
  const [userAvatarUrl, setUserAvatarUrl] = React.useState<string>();
  const [providerClient] = React.useState<Client>(() => ({
    ...client,
    setSession(sessionId, userId, helpdeskId, userAvatarUrl) {
      setFogSessionId(sessionId);
      if (userId) {
        setUserId(userId);
      }

      if (userAvatarUrl) {
        setUserAvatarUrl(userAvatarUrl);
      }

      setHelpdeskId(helpdeskId);
      client?.setSession?.(sessionId, userId, helpdeskId, userAvatarUrl);
    },
  }));
  React.useEffect(() => {
    if (fogSessionId && token && "agentId" in token) {
      setUserId(token.agentId);
    }
  }, [token, userId, fogSessionId]);
  const ws = useServerWs(providerClient, token, isIdle, suspendConnection);
  const sharedRoster = useSharedRoster({
    ws,
    token,
    fogSessionId,
    workspaceId,
    helpdeskId,
    userId,
  });
  return {
    serverCall: ws.serverCall,
    lastIncomingMessage: ws.lastIncomingMessage,
    respondToMessage: ws.respondToMessage,
    helpdesk: ws.helpdesk,
    isConnected: ws.isConnected,
    isAuthenticated: ws.isAuthenticated,
    isTokenWrong: ws.isTokenWrong,
    isAgent: ws.isAgent,
    avatarLibraryUrl: ws.avatarLibraryUrl,
    sharedRoster,
    token,
    fogSessionId,
    userId,
    helpdeskId,
    workspaceId,
    userAvatarUrl,
    isIdle,
    agentRole: ws.agentRole,
  };
}

export const WsProvider: React.FC<{
  token: AnyToken | undefined;
  workspaceId?: string | undefined;
  client?: Client;
  isIdle?: boolean;
  suspendConnection?: boolean;
  children?: React.ReactNode;
}> = ({ token, workspaceId, client, isIdle, suspendConnection, ...props }) => {
  const value = useProviderValue(token, workspaceId, client, isIdle, suspendConnection);
  return <WsContext.Provider value={value} {...props} />;
};

export function useWs() {
  const context = React.useContext(WsContext);
  if (context === undefined) {
    throw new Error(`useWs must be used within a WsProvider`);
  }
  return context;
}

export function useWsCalls() {
  const { workspaceId, serverCall } = useWs();

  const createTag = React.useCallback(
    (tag: string) => {
      if (!workspaceId) {
        return;
      }
      serverCall<TagCreate>({
        msgType: "Tag.Create",
        workspaceId,
        tag,
      }).then(async x => {
        console.assert(x.msgType === "Tag.Ok");
      });
    },
    [workspaceId, serverCall]
  );

  const updateTag = React.useCallback(
    (tag: string, newTag: string) => {
      if (!workspaceId) {
        return;
      }
      serverCall<TagUpdate>({
        msgType: "Tag.Update",
        workspaceId,
        tag,
        newTag,
      }).then(async x => {
        console.assert(x.msgType === "Tag.Ok");
      });
    },
    [workspaceId, serverCall]
  );

  const deleteTag = React.useCallback(
    (tag: string) => {
      if (!workspaceId) {
        return;
      }
      serverCall<TagDelete>({
        msgType: "Tag.Delete",
        workspaceId,
        tag,
      }).then(async x => {
        console.assert(x.msgType === "Tag.Ok");
      });
    },
    [workspaceId, serverCall]
  );

  return { createTag, updateTag, deleteTag };
}

export const nameMatchesFilter = (name: string, filter: string) =>
  [name].concat(name.split(/[\s-]+/)).some(s => s.toLowerCase().startsWith(filter));

type HistoryMode = "latest" | "around";

const useHistoryStore = (initialHistoryMode?: HistoryMode) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const messagesByTargetRef = React.useRef<{ [targetMessageId: string]: Message[] }>({});

  const latestMessages = React.useRef<Message[]>([]);
  const aroundMessages = React.useRef<Message[]>([]);

  const newerHistoryComplete = React.useRef(false);
  const setNewerHistoryComplete = React.useCallback((isComplete: boolean) => {
    if (newerHistoryComplete.current !== isComplete) {
      newerHistoryComplete.current = isComplete;
      forceUpdate();
    }
  }, []);

  const historyMode = React.useRef<HistoryMode>(initialHistoryMode || "latest");
  const setHistoryMode = React.useCallback(
    (mode: HistoryMode) => {
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
        const isUpdate = latestMessages.current
          .concat(aroundMessages.current)
          .find(m => m.id === message.id);
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

  const updateAuthorImageUrl = React.useCallback(e => {
    aroundMessages.current = aroundMessages.current.map(x => {
      if (x.author.id === e.userId) {
        return { ...x, author: { ...x.author, avatarUrl: e.imageUrl } };
      } else {
        return x;
      }
    });

    latestMessages.current = latestMessages.current.map(x => {
      if (x.author.id === e.userId) {
        return { ...x, author: { ...x.author, avatarUrl: e.imageUrl } };
      } else {
        return x;
      }
    });
  }, []);

  const expandLink = React.useCallback((targetMessageId: string, messages: EventMessage[]) => {
    const messagesByTarget = messagesByTargetRef.current;

    messagesByTarget[targetMessageId] = [];

    messages.forEach(message => {
      const {
        id,
        clientId,
        roomId,
        fromId,
        fromName,
        fromAvatarUrl,
        fromType,
        text,
        rawText,
        files,
        createdTs,
        updatedTs,
        deletedTs,
        deletedByName,
        editedTs,
        editedByName,
      } = message;

      messagesByTarget[targetMessageId].push({
        id,
        clientId,
        author: { id: fromId, name: fromName, type: fromType, avatarUrl: fromAvatarUrl },
        createdTs: createdTs || Date.now(),
        updatedTs: updatedTs || Date.now(),
        parsed: text,
        rawText,
        files,
        roomId,
        deletedTs,
        deletedByName,
        editedTs,
        editedByName,
      });
    });
  }, []);

  return {
    messages: historyMode.current === "latest" ? latestMessages.current : aroundMessages.current,
    addMessages,
    updateAuthorImageUrl,
    setHistoryMode,
    latestLoadedMessageTs: latestMessages.current.slice(0, -1)[0]?.createdTs,
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
}: {
  userId: string | undefined;
  roomId: string;
  aroundId: string | undefined;
}) => {
  const { fogSessionId, serverCall, lastIncomingMessage } = useWs();

  const rejectIfUnmounted = useRejectIfUnmounted();

  const {
    messages,
    addMessages,
    updateAuthorImageUrl,
    setHistoryMode,
    latestLoadedMessageTs,
    clearLatestHistory,
    clearAroundHistory,
    newerHistoryComplete,
    setNewerHistoryComplete,
    messagesByTarget,
    expandLink,
  } = useHistoryStore(aroundId ? "around" : "latest");

  const { updateLoadAround } = useLoadAround();

  const processAndStoreMessages = React.useCallback(
    async (messagesIn: EventMessage[], from: "event" | "page") => {
      messagesIn.forEach(({ id, sources }) => {
        if (sources?.length) {
          expandLink(id, extractEventMessage(sources));
        }
      });
      addMessages(messagesIn, from);
    },
    [addMessages, expandLink, serverCall]
  );

  const [subscribed, setSubscribed] = React.useState(false);
  const [subscribing, setSubscribing] = React.useState(false);

  React.useEffect(() => {
    setSubscribed(false);
    setSubscribing(false);
  }, [fogSessionId]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (subscribed || subscribing) {
      return;
    }
    setSubscribing(true);
    serverCall<StreamSub>({
      msgType: "Stream.Sub",
      topic: `room/${roomId}/messages`,
    }).then(async x => {
      console.assert(x.msgType === "Stream.SubOk");
      if (x.msgType === "Stream.SubOk") {
        await processAndStoreMessages(extractEventMessage(x.items), "event");
      }
    });
    serverCall<StreamGet>({
      msgType: "Stream.Get",
      topic: `room/${roomId}/messages`,
      since: latestLoadedMessageTs,
      limit: 30,
    })
      .then(rejectIfUnmounted)
      .then(async x => {
        console.assert(x.msgType === "Stream.GetOk");
        if (x.msgType === "Stream.GetOk") {
          await processAndStoreMessages(extractEventMessage(x.items), "event");
          setNewerHistoryComplete(x.items.length === 0);
          setSubscribed(true);
          setSubscribing(false);
        }
      })
      .catch(() => {});
  }, [
    fogSessionId,
    roomId,
    subscribed,
    subscribing,
    processAndStoreMessages,
    setNewerHistoryComplete,
    serverCall,
    fogSessionId,
  ]);

  const [fetchingOlder, setFetchingOlder] = React.useState(false);
  const [olderHistoryComplete, setOlderHistoryComplete] = React.useState(false);

  const fetchOlderPage = React.useCallback(
    (ts: number | undefined) => {
      setFetchingOlder(true);
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        topic: `room/${roomId}/messages`,
        before: ts,
        limit: 30,
      })
        .then(rejectIfUnmounted)
        .then(async x => {
          console.assert(x.msgType === "Stream.GetOk");
          if (x.msgType === "Stream.GetOk") {
            const items = extractEventMessage(x.items);
            await processAndStoreMessages(items, "page");
            if (items.length === 0 || items.every(x => messages.find(m => m.id === x.id))) {
              setOlderHistoryComplete(true);
            }
            setFetchingOlder(false);
          }
        })
        .catch(() => {});
    },
    [roomId, messages, serverCall, processAndStoreMessages]
  );

  const [fetchingNewer, setFetchingNewer] = React.useState(false);

  const fetchNewerPage = React.useCallback(
    ts => {
      setFetchingNewer(true);
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        topic: `room/${roomId}/messages`,
        since: ts,
        limit: 30,
      })
        .then(rejectIfUnmounted)
        .then(async x => {
          console.assert(x.msgType === "Stream.GetOk");
          if (x.msgType === "Stream.GetOk") {
            await processAndStoreMessages(extractEventMessage(x.items), "page");
            setFetchingNewer(false);
            setNewerHistoryComplete(x.items.length === 0);
          }
        })
        .catch(() => {});
    },
    [roomId, serverCall, processAndStoreMessages]
  );

  const [isAroundFetched, setIsAroundFetched] = React.useState(false);
  const [isAroundFetching, setIsAroundFetching] = React.useState(false);

  const fetchPageAroundId = React.useCallback(
    (aroundId: string) => {
      setIsAroundFetching(true);
      setIsAroundFetched(false);
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        topic: `room/${roomId}/messages`,
        aroundId,
        limit: 30,
      })
        .then(rejectIfUnmounted)
        .then(async x => {
          console.assert(x.msgType === "Stream.GetOk");
          if (x.msgType === "Stream.GetOk") {
            setHistoryMode("around");
            await processAndStoreMessages(extractEventMessage(x.items), "page");
            setIsAroundFetched(true);
            setIsAroundFetching(false);
          }
        })
        .catch(() => {});
    },
    [roomId, serverCall, processAndStoreMessages, setHistoryMode]
  );

  const resetHistoryToLastPage = React.useCallback(() => {
    if (!newerHistoryComplete) {
      clearLatestHistory();
      fetchNewerPage(undefined);
    }
    setHistoryMode("latest");
    setOlderHistoryComplete(false);
    setNewerHistoryComplete(false);
    setIsAroundFetched(false);
    setIsAroundFetching(false);
    updateLoadAround(roomId, undefined);
  }, [roomId, newerHistoryComplete, setHistoryMode, updateLoadAround, clearLatestHistory]);

  React.useLayoutEffect(() => {
    setIsAroundFetched(false);
    setIsAroundFetching(false);
  }, [aroundId]);

  React.useLayoutEffect(() => {
    if (!fogSessionId || !subscribed) {
      return;
    }
    if (aroundId && !fetchingOlder && !fetchingNewer && messages.find(x => x.id === aroundId)) {
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
    fetchingOlder,
    fetchingNewer,
    fetchPageAroundId,
    clearAroundHistory,
    setNewerHistoryComplete,
  ]);

  React.useEffect(() => {
    if (fogSessionId) {
      setNewerHistoryComplete(false);
    }
  }, [fogSessionId]);

  const seenUpToMessageId = React.useRef<string>();
  const setSeenUpToMessageId = React.useCallback((value: string | undefined) => {
    if (!value || !seenUpToMessageId.current || value > seenUpToMessageId.current)
      seenUpToMessageId.current = value;
  }, []);

  const onSeen = React.useCallback(
    (messageId?: string) => {
      if (messageId && (!seenUpToMessageId.current || messageId > seenUpToMessageId.current)) {
        setSeenUpToMessageId(messageId);
        serverCall<MessageSeen>({
          msgType: "Message.Seen",
          roomId,
          messageId,
        }).then(x => {
          console.assert(x.msgType === "Message.Ok");
        });
      } else if (!messageId) {
        serverCall<MessageSeen>({
          msgType: "Message.Seen",
          roomId,
          messageId: undefined,
        }).then(x => {
          console.assert(x.msgType === "Message.Ok");
        });
      }
    },
    [roomId, serverCall, seenUpToMessageId]
  );

  const onSeenBack = React.useCallback(
    (messageId: string) => {
      setSeenUpToMessageId(messageId);
      serverCall<MessageSeen>({
        msgType: "Message.Seen",
        roomId,
        messageId,
      }).then(x => {
        console.assert(x.msgType === "Message.Ok");
      });
    },
    [roomId, serverCall]
  );

  const onUnseen = React.useCallback(() => {
    serverCall<MessageUnseen>({
      msgType: "Message.Unseen",
      roomId,
    }).then(x => {
      console.assert(x.msgType === "Message.Ok");
      setSeenUpToMessageId(undefined);
    });
  }, [roomId, serverCall]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
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
    } else if (lastIncomingMessage?.msgType === "Event.User") {
      updateAuthorImageUrl(lastIncomingMessage);
    }
  }, [fogSessionId, onSeen, userId, roomId, lastIncomingMessage, processAndStoreMessages]);

  React.useEffect(() => {
    if (fogSessionId && userId) {
      // TODO maybe there's a better way to tell users and agents apart?
      const topic = userId.startsWith("a") ? `agent/${userId}/seen` : `user/${userId}/seen`;
      serverCall({
        msgType: "Stream.Get",
        topic,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          console.assert(x.msgType === "Stream.GetOk");
          if (x.msgType === "Stream.GetOk") {
            const seen = extractEventSeen(x.items).find(s => s.roomId === roomId);

            if (seen && seen.msgType === "Event.Seen") {
              setSeenUpToMessageId(seen.messageId);
            } else {
              setSeenUpToMessageId(undefined);
            }
          }
        })
        .catch(() => {});
    }
  }, [fogSessionId, roomId, userId, serverCall]);

  const messageCreate = React.useCallback(
    async (args: MessageCreate) =>
      await serverCall(args)
        .then(rejectIfUnmounted)
        .then(x => {
          if (x.msgType !== "Message.Ok") {
            throw x;
          }
          if (args.roomId === roomId) {
            setSeenUpToMessageId(x.messageId);
          }
        })
        .catch(() => {}),
    [roomId, serverCall]
  );

  const messageCreateMany = React.useCallback(
    async (messages: MessageCreate[]) =>
      await serverCall({
        msgType: "Message.CreateMany",
        clientId: messages.map(m => m.clientId).join("-"),
        messages: messages,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          if (x.msgType !== "Message.Ok") {
            throw x;
          }
          x?.messageIds?.forEach(messageId => {
            if (messages.every(m => m.roomId === roomId)) {
              setSeenUpToMessageId(messageId);
            }
          });
          return x;
        })
        .catch(() => {}),
    [roomId, serverCall]
  );

  const messageUpdate = React.useCallback(
    async (args: MessageUpdate) =>
      await serverCall(args)
        .then(rejectIfUnmounted)
        .then(x => {
          if (x.msgType !== "Message.Ok") {
            throw x;
          }
        })
        .catch(() => {}),
    [roomId, serverCall]
  );

  React.useEffect(() => {
    return () => {
      clearLatestHistory();
      clearAroundHistory();
      serverCall({
        msgType: "Stream.UnSub",
        topic: `room/${roomId}/messages`,
      }).then(x => {
        console.assert(x.msgType === "Stream.UnSubOk");
      });
    };
  }, [roomId, clearLatestHistory, clearAroundHistory, serverCall]);

  return {
    fetchNewerPage,
    fetchOlderPage,
    fetchingNewer,
    fetchingOlder,
    isAroundFetched,
    isAroundFetching,
    messageCreate,
    messageCreateMany,
    messageUpdate,
    messages,
    messagesByTarget,
    newerHistoryComplete,
    olderHistoryComplete,
    onSeen,
    onSeenBack,
    onUnseen,
    resetHistoryToLastPage,
    serverCall,
  };
};

export const useRoomTyping = ({
  userId,
  roomId,
}: {
  userId: string | undefined;
  roomId: string;
}) => {
  const { fogSessionId, serverCall, lastIncomingMessage } = useWs();

  const rejectIfUnmounted = useRejectIfUnmounted();

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
    if (!fogSessionId) {
      return;
    }
    serverCall({
      msgType: "Stream.Sub",
      topic: `room/${roomId}/typing`,
    })
      .then(rejectIfUnmounted)
      .then(x => {
        console.assert(x.msgType === "Stream.SubOk");
        if (x.msgType === "Stream.SubOk") {
          extractEventTyping(x.items).forEach(t => {
            processTypingEvent(t);
          });
        }
      })
      .catch(() => {});

    return () => {
      serverCall({
        msgType: "Stream.UnSub",
        topic: `room/${roomId}/typing`,
      }).then(x => {
        console.assert(x.msgType === "Stream.UnSubOk");
      });
    };
  }, [fogSessionId, roomId, serverCall, processTypingEvent]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (lastIncomingMessage?.msgType === "Event.Typing") {
      processTypingEvent(lastIncomingMessage);
    }
  }, [fogSessionId, lastIncomingMessage, processTypingEvent]);

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

export const useNotifications = ({ userId }: { userId: string | undefined }) => {
  const { fogSessionId, serverCall, lastIncomingMessage } = useWs();
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

  React.useEffect(() => {
    // TODO maybe there's a better way to tell users and agents apart?
    if (fogSessionId && userId) {
      serverCall({
        msgType: "Stream.Sub",
        topic: userId.startsWith("a")
          ? `agent/${userId}/notifications`
          : `user/${userId}/notifications`,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [fogSessionId, updateAgent, userId, serverCall]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (lastIncomingMessage?.msgType === "Event.Notification.Message") {
      setNotification(lastIncomingMessage);
    }
  }, [fogSessionId, setNotification, lastIncomingMessage]);

  return { agents, notification, lastIncomingMessage };
};

export const useIssues = ({ workspaceId }: { workspaceId?: string }) => {
  const { fogSessionId, token, serverCall } = useWs();
  const [issuesFilter, setIssuesFilter] = React.useState<string>();
  const [issues, setIssues] = React.useState([] as EventIssue[]);

  const searchIssues: (workspaceId: string, issuesFilter: string) => void = React.useCallback(
    throttle(
      (workspaceId: string, issuesFilter: string) =>
        serverCall({
          msgType: "Search.Issues",
          workspaceId,
          term: issuesFilter,
        }).then(x => {
          if (x.msgType !== "Search.Ok") {
            throw x;
          }
          setIssues(x.items);
        }),
      2000
    ),
    [serverCall]
  );

  React.useEffect(() => {
    if (token && issuesFilter && workspaceId) {
      searchIssues(workspaceId, issuesFilter);
    } else {
      setIssues([]);
    }
  }, [fogSessionId, token, workspaceId, serverCall, issuesFilter]);

  return { issues, setIssuesFilter };
};
