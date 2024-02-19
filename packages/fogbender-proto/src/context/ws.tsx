import type {
  AnyToken,
  EventIssue,
  EventMessage,
  EventNotificationMessage,
  EventTyping,
  Attachment,
  AuthorType,
  MessageCreate,
  MessageUpdate,
  MessageSeen,
  MessageUnseen,
  MentionIn,
  Reaction,
  RoomUpdate,
  StreamGet,
  StreamSub,
  TagCreate,
  TagUpdate,
  TagDelete,
  EventUser,
} from "../schema";
import throttle from "lodash.throttle";
import { atom, useAtomValue } from "jotai";
import { useUpdateAtom } from "jotai/utils";
import React from "react";

import { useLoadAround } from "./loadAround";
import { useSharedRosterInternal } from "./sharedRoster";
import { useServerWs } from "../useServerWs";
import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";
import type { Client } from "../client";
import { extractEventMessage, extractEventSeen, extractEventTyping } from "../utils/castTypes";

export type Author = {
  id: string;
  name: string;
  type: AuthorType;
  userType?: "visitor-verified" | "visitor-unverified" | "user";
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
  files: Attachment[];
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
  fromNameOverride?: string;
  fromAvatarUrlOverride?: string;
  deletedByType?: AuthorType;
  deletedById?: string;
  editedByType?: AuthorType;
  editedById?: string;
};

export const convertEventMessageToMessage = (message: EventMessage): Message => ({
  id: message.id,
  clientId: message.clientId,
  author: {
    id: message.fromId,
    name: message.fromName || "",
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
  fromNameOverride: message.fromNameOverride ?? undefined,
  fromAvatarUrlOverride: message.fromAvatarUrlOverride,
});

export type WsContextType = ReturnType<typeof useProviderValue>;

const WsContext = React.createContext<WsContextType | undefined>(undefined);
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
    setSession({
      sessionId,
      userId,
      helpdeskId,
      userAvatarUrl,
      userName,
      userEmail,
      customerName,
    }) {
      setFogSessionId(sessionId);
      if (userId) {
        setUserId(userId);
      }

      if (userAvatarUrl) {
        setUserAvatarUrl(userAvatarUrl);
      }

      setHelpdeskId(helpdeskId);
      client?.setSession?.({
        sessionId,
        userId,
        helpdeskId,
        userAvatarUrl,
        userName,
        userEmail,
        customerName,
      });
    },
  }));
  React.useEffect(() => {
    if (fogSessionId && token && "agentId" in token) {
      setUserId(token.agentId);
    }
  }, [token, userId, fogSessionId]);
  const ws = useServerWs(providerClient, token, isIdle, suspendConnection);
  // shared roster
  const sharedRoster = useSharedRosterInternal({
    ws,
    token,
    fogSessionId,
    workspaceId,
    helpdeskId,
    userId,
  });
  const sharedRosterAtom = React.useState(() => atom(sharedRoster))[0];
  {
    const setSharedRoster = useUpdateAtom(sharedRosterAtom);
    React.useEffect(() => {
      setSharedRoster(sharedRoster);
    }, [sharedRoster, setSharedRoster]);
  }

  const lastIncomingMessage = useAtomValue(ws.lastIncomingMessageAtom);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }

    if (lastIncomingMessage?.msgType === "Event.User") {
      setUserAvatarUrl(lastIncomingMessage.imageUrl);
    }
  }, [fogSessionId, lastIncomingMessage]);

  return React.useMemo(() => {
    return {
      client: client,
      serverCall: ws.serverCall,
      widgetId: ws.widgetId,
      lastIncomingMessageAtom: ws.lastIncomingMessageAtom,
      sharedRosterAtom,
      respondToMessage: ws.respondToMessage,
      helpdesk: ws.helpdesk,
      isConnected: ws.isConnected,
      isAuthenticated: ws.isAuthenticated,
      isTokenWrong: ws.isTokenWrong,
      isAgent: ws.isAgent,
      userType: ws.userType,
      avatarLibraryUrl: ws.avatarLibraryUrl,
      token,
      fogSessionId,
      userId,
      helpdeskId,
      workspaceId,
      userAvatarUrl,
      agentRole: ws.agentRole,
      visitorJWT: ws.visitorJWT,
    };
  }, [
    client,
    ws.widgetId,
    ws.serverCall,
    ws.lastIncomingMessageAtom,
    sharedRosterAtom,
    ws.respondToMessage,
    ws.helpdesk,
    ws.isConnected,
    ws.isAuthenticated,
    ws.isTokenWrong,
    ws.isAgent,
    ws.userType,
    ws.avatarLibraryUrl,
    ws.visitorJWT,
    token,
    fogSessionId,
    userId,
    helpdeskId,
    workspaceId,
    userAvatarUrl,
    ws.agentRole,
  ]);
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

  const markRoomAsSeen = React.useCallback(
    (roomId: string) => {
      serverCall<MessageSeen>({
        msgType: "Message.Seen",
        roomId,
      }).then(x => {
        console.assert(x.msgType === "Message.Ok");
      });
    },
    [serverCall]
  );

  const markRoomAsUnseen = React.useCallback(
    (roomId: string) => {
      serverCall<MessageUnseen>({
        msgType: "Message.Unseen",
        roomId,
      }).then(x => {
        console.assert(x.msgType === "Message.Ok");
      });
    },
    [serverCall]
  );

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

  const resolveRoom = React.useCallback(
    (roomId: string, tilTs?: number) => {
      return serverCall({ msgType: "Room.Resolve", roomId, tilTs });
    },
    [serverCall]
  );

  const unresolveRoom = React.useCallback(
    (roomId: string) => {
      return serverCall({ msgType: "Room.Unresolve", roomId });
    },
    [serverCall]
  );

  return {
    updateRoom,
    markRoomAsSeen,
    markRoomAsUnseen,
    createTag,
    updateTag,
    deleteTag,
    resolveRoom,
    unresolveRoom,
  };
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

  const updateAuthorImageUrl = React.useCallback((e: EventUser) => {
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
        author: { id: fromId, name: fromName || "", type: fromType, avatarUrl: fromAvatarUrl },
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

export const useSharedRoster = () => {
  const { sharedRosterAtom } = useWs();
  return useAtomValue(sharedRosterAtom);
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
  const { fogSessionId, serverCall, lastIncomingMessageAtom } = useWs();
  const lastIncomingMessage = useAtomValue(lastIncomingMessageAtom);

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
    (ts: number | undefined) => {
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
      }).then(x => {
        if (x.msgType !== "Message.Ok") {
          throw x;
        }
        x?.messageIds?.forEach(messageId => {
          if (messages.every(m => m.roomId === roomId)) {
            setSeenUpToMessageId(messageId);
          }
        });
        return x;
      }),
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
  const { fogSessionId, serverCall, lastIncomingMessageAtom } = useWs();
  const lastIncomingMessage = useAtomValue(lastIncomingMessageAtom);

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

export const useNotifications = ({ userId }: { userId: string | undefined }) => {
  const { fogSessionId, serverCall, lastIncomingMessageAtom } = useWs();
  const lastIncomingMessage = useAtomValue(lastIncomingMessageAtom);
  const [notification, setNotification] = React.useState<EventNotificationMessage>();

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
  }, [fogSessionId, userId, serverCall]);

  React.useEffect(() => {
    if (!fogSessionId) {
      return;
    }
    if (lastIncomingMessage?.msgType === "Event.Notification.Message") {
      setNotification(lastIncomingMessage);
    }
  }, [fogSessionId, setNotification, lastIncomingMessage]);

  return { notification, lastIncomingMessage };
};

export const useIssues = ({ workspaceId }: { workspaceId?: string }) => {
  const { fogSessionId, token, serverCall } = useWs();
  const [issuesFilter, setIssuesFilter] = React.useState<string>();
  const [issues, setIssues] = React.useState([] as EventIssue[]);
  const [isLoading, setIsLoading] = React.useState(false);

  // https://www.loom.com/share/337bc19ada86447a80d3f189ad8e09ce
  const throttledRef = React.useRef<{
    [fId: string]: ((x: string, y: string, z: string) => void) & { cancel: () => void };
  }>({});

  const searchIssues: ((workspaceId: string, issuesFilter: string, fId: string) => void) & {
    cancel: () => void;
  } = React.useCallback(
    throttle((workspaceId: string, issuesFilter: string, fId: string) => {
      setIsLoading(true);
      serverCall({
        msgType: "Search.Issues",
        workspaceId,
        term: issuesFilter,
      })
        .then(x => {
          if (x.msgType !== "Search.Ok") {
            throw x;
          }

          if (throttledRef.current[fId]) {
            delete throttledRef.current[fId];
            setIssues(x.items);
          } else {
            setIssues([]);
          }
        })
        .finally(() => setIsLoading(false));
    }, 2000),
    [serverCall]
  );

  React.useEffect(() => {
    if (token && workspaceId) {
      if (issuesFilter) {
        const fId = Math.random().toString(36).substring(7);
        const f = searchIssues;

        throttledRef.current[fId] = f;

        f(workspaceId, issuesFilter, fId);
      } else {
        const fIds = Object.keys(throttledRef.current);

        fIds.forEach(fId => {
          throttledRef.current[fId].cancel();
          delete throttledRef.current[fId];
        });

        setIssues([]);
      }
    } else {
      setIssues([]);
    }
  }, [fogSessionId, token, workspaceId, serverCall, issuesFilter]);

  return { issues, issuesFilter, setIssuesFilter, issuesLoading: isLoading };
};
