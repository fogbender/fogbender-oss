import classNames from "classnames";
import { ResizeSensor } from "css-element-queries";
import dayjs from "dayjs";
import {
  AiSuggest,
  Author,
  convertEventMessageToMessage,
  EventRoom,
  extractEventMessage,
  Helpdesk,
  Integration as IntegrationT,
  KnownIssueTrackerIntegrations,
  Message,
  MessageCreate,
  MessageUpdate,
  Room as RoomT,
  ServerCall,
  StreamGet,
  Tag as TagT,
  useLoadAround,
  useRoomHistory,
  useRoomTyping,
  useRosterActions,
  useSharedRoster,
  useWsCalls,
} from "fogbender-proto";
import { useAtom, useAtomValue } from "jotai";
import React, { Suspense } from "react";
import { useQuery } from "react-query";

import { FileUploadPreview } from "../components/FileUpload";
import { Icons } from "../components/Icons";
import { LoadingIndicator, UnreadCircle } from "../components/lib";
import { Modal } from "../components/Modal";
import { TextAreaMode, useTextarea } from "../components/useTextarea";
import { MessageFileThumbnail } from "../messages/MessageFileThumbnail";
import { MessageView } from "../messages/MessageView";
import { useNewMessagesAt } from "../messages/useNewMessagesAt";
import { useSelection } from "../messages/useSelection";
import { showAiHelperAtom } from "../store/config.store";
import { Agent, VendorBilling } from "../types";
import { atomWithLocalStorage } from "../utils/atomWithLocalStorage";
import { formatRoomTs } from "../utils/formatTs";
import { getPreviousMessageId } from "../utils/serverBigInt";
import { useClickOutside } from "../utils/useClickOutside";
import { useFileUpload } from "../utils/useFileUpload";
import { useHeightWatcher } from "../utils/useHeightWatcher";
import { useScrollTracker } from "../utils/useScrollTracker";

import { FileIssue } from "./FileIssue";
import { LayoutOptions } from "./LayoutOptions";
import { MessageForward } from "./MessageForward";
import { RoomHeader } from "./RoomHeader";
import styles from "./styles/room.module.css";

const SelectDateMenu = React.lazy(() => import("../components/SelectDateMenu"));

const ResolvedControls = (props: {
  roomId: string;
  resolved: boolean;
  resolvedTil?: null | number;
}) => {
  const { roomId, resolved, resolvedTil } = props;
  const { resolveRoom, unresolveRoom } = useWsCalls();
  const [isSelectDateVisible, setIsSelectDateVisible] = React.useState(false);
  const menuRef = React.useRef<HTMLInputElement>(null);

  useClickOutside(menuRef, () => setIsSelectDateVisible(false), !isSelectDateVisible);

  const commonBtnStyles = "px-2 flex item-center rounded flex-start py-0.5";

  const onResolve = () => {
    resolveRoom(roomId);
  };

  const onUnResolveNow = () => {
    unresolveRoom(roomId);
  };

  const onSelectDate = (dateTs: number) => {
    resolveRoom(roomId, dateTs);
  };
  const showSnoozeTimer = resolved && resolvedTil;
  return (
    <div
      className={classNames(
        styles["z-1"],
        "absolute bg-gray-200 items-center flex p-1 right-0 rounded-bl-lg text-xs top-0 whitespace-nowrap gap-2"
      )}
    >
      {showSnoozeTimer && (
        <span className="pl-1 text-gray-600 text-xs">
          Unresolves in {dayjs(showSnoozeTimer / 1000).fromNow(true)}
        </span>
      )}
      <button className={classNames(commonBtnStyles, resolved && "bg-white")} onClick={onResolve}>
        {resolved ? (resolvedTil ? "Cancel timer" : "Resolved") : "Resolve"}
      </button>
      {!showSnoozeTimer && (
        <button
          className={classNames(commonBtnStyles, !resolved && "bg-purple-700 text-white group")}
          onClick={onUnResolveNow}
        >
          {resolved ? "Unresolve" : "Unresolved"}
        </button>
      )}
      <button
        title="Unresolve later"
        className="mr-[14px]"
        onClick={e => {
          setIsSelectDateVisible(prev => !prev);
          e.stopPropagation();
        }}
      >
        <Icons.SnoozeTimer className="w-4 h-[16.25px]" />
      </button>
      {isSelectDateVisible && (
        <Suspense fallback={null}>
          <SelectDateMenu
            menuRef={menuRef}
            onSelectDate={onSelectDate}
            setIsSelectDateVisible={setIsSelectDateVisible}
            title="Unresolve later"
            placeholder="Try: 8am, 3 days, aug 7, in 2 weeks"
          />
        </Suspense>
      )}
    </div>
  );
};

export const Room: React.FC<{
  myAuthor: Author;
  ourId: string | undefined;
  isAgent: boolean | undefined;
  agents?: Agent[];
  billing?: VendorBilling;
  roomId: string;
  vendorId: string | undefined;
  workspaceId: string | undefined;
  helpdesk: Helpdesk | undefined;
  activeRoomId: string | undefined;
  setActiveRoomId: (id: string) => void;
  isLayoutPinned: boolean;
  isExpanded: boolean;
  resizing?: boolean;
  dragging?: boolean;
  onClose: (id: string) => void;
  onCloseOtherRooms: (id?: string) => void;
  onSettings?: (id: string) => void;
  onOpenSearch: (id: string) => void;
  onOpenDialog: (userId: string, helpdeskId: string) => void;
  onSetRoomPin: (roomId: string | undefined, pinned: boolean) => void;
  onGoFullScreen?: () => void;
  showIssueInfo: TagT | undefined;
  onShowIssueInfo: (tag: TagT) => void;
  roomById: (id: string) => RoomT | undefined;
  firstUnreadId: string | undefined;
  firstUnreadMentionId: string | undefined;
  workspaceIntegrations?: IntegrationT[];
  isIdle: boolean;
  singleRoomMode: boolean;
  isConnected: boolean;
  agentRole?: string;
  internalHelpdeskId?: string;
  rosterVisible?: boolean;
  openRoom: (room: EventRoom, opts: LayoutOptions) => void;
}> = ({
  myAuthor,
  ourId,
  isAgent,
  billing,
  agents,
  roomId,
  vendorId,
  workspaceId,
  helpdesk,
  activeRoomId,
  setActiveRoomId,
  isLayoutPinned,
  isExpanded,
  resizing,
  dragging,
  onClose,
  onCloseOtherRooms,
  onSettings,
  onOpenSearch,
  onOpenDialog,
  onSetRoomPin,
  onGoFullScreen,
  showIssueInfo,
  onShowIssueInfo,
  roomById,
  firstUnreadId,
  firstUnreadMentionId,
  workspaceIntegrations,
  isIdle,
  singleRoomMode,
  isConnected,
  agentRole,
  internalHelpdeskId,
  rosterVisible,
}) => {
  const room = roomById(roomId);
  const helpdeskId = room?.helpdeskId || "UNKNOWN_HELPDESK";

  const onOpenDialogCb = React.useCallback(
    (messageAuthorId: string, messageAuthorType: string | undefined) =>
      onOpenDialog(
        messageAuthorId,
        messageAuthorType === "agent" && internalHelpdeskId ? internalHelpdeskId : helpdeskId
      ),
    [onOpenDialog, helpdeskId, internalHelpdeskId]
  );

  const { loadAroundByRoom, updateLoadAround } = useLoadAround();
  const loadAroundMessage = loadAroundByRoom[roomId];
  const isActiveRoom = activeRoomId === roomId;

  const { badges } = useSharedRoster();
  const { updateRoom } = useRosterActions({
    workspaceId,
    helpdeskId,
  });

  const unreadCount = badges[roomId]?.count ?? 0;
  const mentionsCount = badges[roomId]?.mentionsCount ?? 0;
  const totalUnreadCount = unreadCount + mentionsCount;
  const hasMentions = mentionsCount > 0;

  const {
    messages,
    fetchOlderPage,
    fetchingOlder,
    olderHistoryComplete,
    fetchNewerPage,
    fetchingNewer,
    newerHistoryComplete,
    isAroundFetched,
    resetHistoryToLastPage,
    serverCall,
    messagesByTarget,
    onSeen,
    onSeenBack,
    onUnseen,
    messageCreate,
    messageCreateMany,
  } = useRoomHistory({
    userId: ourId,
    roomId,
    aroundId: loadAroundMessage?.messageId,
  });

  const historyRef = React.useRef<HTMLDivElement>(null);
  const messageareaHeight = useHeightWatcher(historyRef);

  const {
    onMessageRef,
    onHistoryScroll,
    keepScrollAtBottom,
    setKeepScrollAtBottom,
    maybeStickToBottom,
  } = useScrollTracker({
    isActiveRoom,
    messages,
    loadAroundMessage,
    historyRef,
    resizing,
    dragging,
    newerHistoryComplete,
    fetchNewerPage,
    fetchingNewer,
    olderHistoryComplete,
    fetchOlderPage,
    fetchingOlder,
    onSeen,
    isIdle,
    isConnected,
  });

  const [flash, setFlash] = React.useState<string>();

  React.useEffect(() => {
    if (loadAroundMessage && isAroundFetched) {
      setFlash(loadAroundMessage.messageId);
    }
  }, [loadAroundMessage, isAroundFetched]);

  React.useEffect(() => {
    if (flash) {
      const t = window.setTimeout(() => {
        setFlash(undefined);
        updateLoadAround(roomId, undefined);
      }, 1000);
      return () => {
        clearTimeout(t);
      };
    } else {
      return undefined;
    }
  }, [flash]);

  // clear loadAroundMessage on room close
  React.useEffect(() => {
    return () => {
      updateLoadAround(roomId, undefined);
    };
  }, [roomId, updateLoadAround]);

  const { typingNames, updateTyping } = useRoomTyping({ userId: ourId, roomId });

  const roomRef = React.useRef<HTMLDivElement>(null);

  const {
    getInputProps,
    getRootProps,
    isDragActive,
    fileUploadAtom,
    fileIdsAtom,
    deletedFileIdsAtom,
  } = useFileUpload({
    roomId,
    isActiveRoom,
  });

  const roomFooterRef = React.useRef<HTMLDivElement>(null);
  const roomFooterHeight = useHeightWatcher(roomFooterRef);

  React.useLayoutEffect(() => {
    let sensor: ResizeSensor | undefined;
    if (roomRef.current) {
      sensor = new ResizeSensor(roomRef.current, maybeStickToBottom);
    }
    return () => sensor?.detach();
  }, [maybeStickToBottom]);

  const jumpToBottom = React.useCallback(() => {
    if (historyRef.current) {
      const { scrollHeight, clientHeight } = historyRef.current;
      historyRef.current.scrollTop = scrollHeight - clientHeight;
      updateLoadAround(roomId, undefined);
      setKeepScrollAtBottom(true);
      if (!newerHistoryComplete) {
        resetHistoryToLastPage();
      }
    }
  }, [
    roomId,
    newerHistoryComplete,
    resetHistoryToLastPage,
    updateLoadAround,
    setKeepScrollAtBottom,
  ]);

  const jumpToFirstUnread = React.useCallback(() => {
    if (firstUnreadId) {
      updateLoadAround(roomId, firstUnreadId);
    } else {
      jumpToBottom();
    }
  }, [roomId, firstUnreadId, updateLoadAround, jumpToBottom]);

  const jumpToFirstUnreadMention = React.useCallback(() => {
    if (firstUnreadMentionId) {
      updateLoadAround(roomId, firstUnreadMentionId);
    } else {
      jumpToBottom();
    }
  }, [roomId, firstUnreadMentionId, updateLoadAround, jumpToBottom]);

  const roomName = room?.counterpart?.name || room?.name;

  const { selection, handleMessageClick, handleSelectionCancel, handleLastMessageEdit } =
    useSelection({ messages, userId: ourId });

  const [highlightedTags, setHighlightedTags] = React.useState<string[]>([]);

  const flipTagHighlight = React.useCallback(
    (tag: string) => {
      if (highlightedTags.includes(tag)) {
        setHighlightedTags(highlightedTags.filter(t => t !== tag));
      } else {
        setHighlightedTags(highlightedTags.concat([tag]));
      }
    },
    [highlightedTags, setHighlightedTags]
  );

  const messageUpdate = React.useCallback(
    (message: MessageUpdate) => {
      serverCall(message).then(x => {
        console.assert(x.msgType === "Message.Ok");
        handleSelectionCancel();
      });
    },
    [serverCall, handleSelectionCancel]
  );

  const setReaction = React.useCallback(
    (messageId: string, reaction?: string) => {
      serverCall({
        msgType: "Message.SetReaction",
        messageId,
        reaction: reaction || null,
      }).then(x => {
        console.assert(x.msgType === "Message.Ok");
      });
    },
    [serverCall]
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInput = React.useMemo(
    () => <input {...getInputProps()} ref={fileInputRef} />,
    [getInputProps]
  );
  const handleUploadClick = React.useCallback(() => fileInputRef.current?.click(), []);

  const isInternal = roomById(roomId)?.customerName.startsWith("$Cust_Internal");

  const showAiHelper = useAtomValue(showAiHelperAtom);
  const aiEnabled = workspaceIntegrations?.find(i => i.type === "ai") !== undefined;

  const pendingAtom = React.useRef(
    atomWithLocalStorage(`_pending_${roomId}`, [] as Message[])
  ).current;
  const [pendingMessages0, setPendingMessages] = useAtom(pendingAtom);

  const [serverPending, setServerPending] = React.useState(new Set<string>());

  const [pendingMessages, noLongerPending] = React.useMemo(() => {
    // we are working on pendingMessages array so that if we don't have any pending messages array.filter will exit quickly
    const noLongerPending = pendingMessages0.filter(pendingMessage =>
      messages.some(m => m.clientId === pendingMessage.clientId)
    );
    if (noLongerPending.length > 0) {
      return [pendingMessages0.filter(m => !noLongerPending.includes(m)), noLongerPending];
    }
    return [pendingMessages0, undefined];
  }, [messages, pendingMessages0]);
  React.useEffect(() => {
    if (noLongerPending) {
      setPendingMessages(x => x.filter(m => !noLongerPending.includes(m)));
    }
  }, [messages, noLongerPending, pendingMessages, setPendingMessages]);

  const messageCreateWithPending: typeof messageCreate = React.useCallback(
    (message: MessageCreate & { createdTs?: number }) => {
      if (message.linkType === "forward") {
        return messageCreate(message);
      }
      // use original value when user clicks on Retry
      const ts = message.createdTs || new Date().getTime() * 1000;
      setPendingMessages(oldPending => {
        const pending = [...oldPending];
        pending.push({
          author: myAuthor,
          fromNameOverride: undefined,
          id: message.clientId,
          clientId: message.clientId,
          createdTs: ts,
          // files: message.fileIds?.map(id => ({ id })) || [],
          // TODO: file upload done not here
          files: [],
          parsed: `${message.text}`,
          rawText: message.text,
          roomId,
          updatedTs: ts,
        });
        return pending.sort((a, b) => a.createdTs - b.createdTs);
      });
      setServerPending(old => new Set(old).add(message.clientId));
      return messageCreate(message).finally(() => {
        setTimeout(() => {
          setServerPending(old => {
            old.delete(message.clientId);
            return new Set(old);
          });
        }, 500);
      });
    },
    [setPendingMessages, messageCreate, myAuthor, roomId]
  );

  const { Textarea, mode, textareaRef } = useTextarea({
    userId: ourId,
    isAgent,
    workspaceId,
    helpdeskId,
    roomId,
    roomName,
    isActiveRoom,
    onFocus: setActiveRoomId,
    fileIdsAtom,
    deletedFileIdsAtom,
    selection,
    cancelSelection: handleSelectionCancel,
    onEditorChange: (mode: TextAreaMode | undefined) => {
      if (mode === undefined || mode === "Reply") {
        updateTyping();
      }
    },
    afterSend: jumpToBottom,
    messageCreate: messageCreateWithPending,
    messageUpdate,
    handleUploadClick,
    isConnected,
    myAuthor,
    agentRole,
    onLastMessageEdit: handleLastMessageEdit,
    isCustomerInternal: isInternal,
  });

  React.useLayoutEffect(() => {
    if (isActiveRoom && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActiveRoom, roomId, textareaRef]);

  const { newMessagesAtId, newMessagesIsDimmed } = useNewMessagesAt({
    firstUnreadId,
    isActiveRoom: isActiveRoom && !isIdle,
  });

  React.useLayoutEffect(() => {
    maybeStickToBottom();
  }, [maybeStickToBottom, newMessagesAtId, roomFooterHeight, selection, messageareaHeight]);

  const onMarkMessageUnread = React.useCallback(
    (message: Message) => {
      const prevId = getPreviousMessageId(message.id) || message.id;
      onSeenBack(prevId);
      onClose(message.roomId);
    },
    [onClose, onSeenBack]
  );

  const selectedSingleMessageId = selection.length === 1 ? selection[0].id : undefined;
  const resolved = Boolean(room?.resolved);

  const onForwardCompletion = React.useCallback(() => {
    setShowForward(false);
    setShowFileIssue(false);
    handleSelectionCancel();
  }, [handleSelectionCancel]);

  const [showForward, setShowForward] = React.useState(false);
  const [showFileIssue, setShowFileIssue] = React.useState(false);

  const issueTrackerIntegrations = workspaceIntegrations?.filter(wi =>
    KnownIssueTrackerIntegrations.includes(wi.type)
  );

  const pins = React.useMemo(() => {
    // personal pin - :@a00396854786080641024:mpin:m00404026473494614016
    // public pin - :mpin:m00404026422550597632

    return (room?.tags || []).reduce((acc, t) => {
      const parts = t.name.split(":");

      if (parts.length === 3 && parts[1] === "mpin") {
        const pinTag: PinTag = { messageId: parts[2], isPrivate: false };
        return acc.concat(pinTag);
      } else if (parts.length === 4 && parts[1].startsWith("@") && parts[2] === "mpin") {
        const pinOwnerId = parts[1].slice(1);

        if (pinOwnerId === ourId) {
          const pinTag: PinTag = { messageId: parts[3], isPrivate: true };
          return acc.concat(pinTag);
        } else {
          return acc;
        }
      }

      return acc;
    }, [] as PinTag[]);
  }, [room?.tags]);

  const sortedPins = React.useMemo(
    () =>
      [...pins].sort((a, b) => {
        if (a.messageId < b.messageId) {
          return -1;
        }
        if (a.messageId > b.messageId) {
          return 1;
        }
        return 0;
      }),
    [pins]
  );

  const pinToRoom = React.useCallback(
    (isPinned: boolean, roomId: string, tag: string) => {
      if (isPinned) {
        updateRoom({ roomId, tagsToRemove: [tag] });
      } else {
        updateRoom({ roomId, tagsToAdd: [tag] });
      }
    },
    [updateRoom]
  );

  const customerDetailsPath = isAgent
    ? `/admin/vendor/${vendorId}/workspace/${workspaceId}/customers/${room?.customerId}`
    : undefined;

  const askAi = React.useCallback(async () => {
    if (selection) {
      const startMessageId = selection[0].id;
      const endMessageId =
        selection.length > 1 ? selection[selection.length - 1].id : startMessageId;

      const res = await serverCall<AiSuggest>({
        msgType: "Ai.Suggest",
        roomId,
        startMessageId,
        endMessageId,
      });

      if (res.msgType === "Ai.Ok") {
        setShowForward(false);
        handleSelectionCancel();
      }
    }
  }, [handleSelectionCancel, roomId, selection, serverCall]);

  const inViolation = (isAgent && (billing?.unpaid_seats || 0) > 0) || billing?.delinquent;

  return (
    <div
      {...getRootProps({
        className: classNames(
          "relative flex flex-col justify-end overflow-hidden h-full focus:outline-none bg-white",
          singleRoomMode
            ? "sm:px-2 sm:border-l"
            : [
                "sm:border sm:rounded-lg",
                activeRoomId === roomId
                  ? isInternal
                    ? "border-green-500"
                    : "border-brand-orange-500"
                  : "border-transparent",
                isDragActive && "border-green-800",
                isInternal
                  ? "fog:box-shadow-m-green"
                  : activeRoomId === roomId
                  ? "fog:box-shadow-m-brand-orange"
                  : "fog:box-shadow-m",
              ]
        ),
        ref: roomRef,
        role: "none",
      })}
    >
      {room && (
        <RoomHeader
          room={room}
          roomId={roomId}
          paneId={roomId}
          mode="Room"
          helpdesk={helpdesk}
          ourId={ourId}
          isAgent={isAgent}
          agents={agents}
          singleRoomMode={singleRoomMode}
          onGoFullScreen={onGoFullScreen}
          isActive={singleRoomMode || activeRoomId === roomId}
          isLayoutPinned={isLayoutPinned}
          isExpanded={isExpanded}
          isDraggable={!singleRoomMode}
          onClose={onClose}
          onCloseOtherRooms={onCloseOtherRooms}
          onOpenSearch={onOpenSearch}
          onSettings={onSettings}
          onUnseen={onUnseen}
          onSetRoomPin={onSetRoomPin}
          showIssueInfo={showIssueInfo}
          onShowIssueInfo={onShowIssueInfo}
          rosterVisible={rosterVisible}
          customerDetailsPath={customerDetailsPath}
          vendorId={vendorId}
          workspaceId={workspaceId}
        />
      )}
      {sortedPins &&
        sortedPins?.length > 0 &&
        sortedPins.map(pin => (
          <PinnedMessageComponent
            key={pin.messageId}
            pin={pin}
            roomId={roomId}
            serverCall={serverCall}
          />
        ))}
      <div className="overflow-hidden relative flex flex-col justify-end h-full">
        {agentRole && agentRole !== "reader" && room && !isInternal && keepScrollAtBottom && (
          <ResolvedControls roomId={roomId} resolved={resolved} resolvedTil={room?.resolvedTil} />
        )}
        <div
          className={classNames(
            "fbr-scrollbar flex flex-col justify-start flex-1 overflow-auto overflow-x-hidden text-black",
            !room && "filter blur pointer-events-none"
          )}
          ref={historyRef}
          onScroll={onHistoryScroll}
        >
          <LoadingIndicator visible={fetchingOlder} />
          <div
            className={classNames(
              "mt-16 fog:text-body-s my-1 text-center text-gray-500",
              !room && "invisible"
            )}
          >
            {room && (olderHistoryComplete || (newerHistoryComplete && messages.length === 0)) ? (
              <>
                Room created on {formatRoomTs(room.createdTs)}
                {room.createdBy && (
                  <>
                    {" by "}
                    {room.createdBy.name}
                  </>
                )}
              </>
            ) : (
              "."
            )}
          </div>
          {messages.map((msg, i) => (
            <MessageView
              key={msg.id}
              message={msg}
              prevMessage={messages[i - 1]}
              nextMessage={i === messages.length - 1 ? pendingMessages[0] : messages[i + 1]}
              isLast={i === messages.length - 1}
              isFirst={i === 0}
              onMessageClick={handleMessageClick}
              onMarkMessageUnread={onMarkMessageUnread}
              onMessageExpand={maybeStickToBottom}
              selected={selection.find(x => x.id === msg.id) !== undefined}
              selectedSingle={selectedSingleMessageId === msg.id}
              selectionCount={selection.length > 0 ? selection.length : undefined}
              isLastSelected={selection.slice(-1)[0]?.id === msg.id}
              flipTagHighlight={flipTagHighlight}
              highlightedTags={highlightedTags}
              roomById={roomById}
              inInternalRoom={isInternal || false}
              messageUpdate={messageUpdate}
              setReaction={setReaction}
              sourceMessages={messagesByTarget[msg.id]}
              onMessageRef={onMessageRef}
              highlight={flash === msg.id}
              newMessagesAtId={newMessagesAtId}
              newMessagesIsDimmed={newMessagesIsDimmed}
              allowForward={isAgent === true}
              allowFileIssue={room?.type !== "dialog"}
              showAiHelper={aiEnabled && showAiHelper}
              allowDelete={
                !msg.deletedTs &&
                (isAgent || msg.author.id === myAuthor.id) &&
                !(agentRole === "reader" && !isInternal)
              }
              myAuthor={myAuthor}
              onOpenDialog={onOpenDialogCb}
              cancelSelection={handleSelectionCancel}
              inDialog={room?.type === "dialog"}
              doForward={setShowForward}
              doFileIssue={setShowFileIssue}
              roomId={roomId}
              pinToRoom={pinToRoom}
              askAi={askAi}
            />
          ))}
          {pendingMessages.map((msg, i) => (
            <MessageView
              key={msg.id}
              message={msg}
              prevMessage={i === 0 ? messages[messages.length - 1] : pendingMessages[i - 1]}
              nextMessage={pendingMessages[i + 1]}
              isLast={i === pendingMessages.length - 1}
              isFirst={i === 0 && messages.length === 0}
              onMessageClick={undefined}
              selected={false}
              selectedSingle={false}
              flipTagHighlight={flipTagHighlight}
              highlightedTags={highlightedTags}
              roomById={roomById}
              inInternalRoom={isInternal || false}
              messageUpdate={messageUpdate}
              setReaction={setReaction}
              sourceMessages={messagesByTarget[msg.id]}
              onMessageRef={undefined}
              highlight={undefined}
              newMessagesAtId={newMessagesAtId}
              newMessagesIsDimmed={newMessagesIsDimmed}
              allowForward={false}
              allowFileIssue={false}
              allowDelete={false}
              showAiHelper={false}
              isPending={true}
              pendingMessageActions={
                !serverPending.has(msg.clientId)
                  ? (action: "retry" | "discard") => {
                      // insert new one before removing old one to better preserve scroll position
                      if (action === "retry") {
                        messageCreateWithPending({
                          ...msg,
                          msgType: "Message.Create",
                          mentions: [],
                          text: msg.rawText,
                          clientId: msg.clientId + "!",
                        });
                      }
                      setPendingMessages(old => old.filter(m => m.clientId !== msg.clientId));
                    }
                  : undefined
              }
              myAuthor={myAuthor}
              cancelSelection={handleSelectionCancel}
              inDialog={room?.type === "dialog"}
            />
          ))}
        </div>
      </div>
      <div
        className={classNames(
          "relative flex items-center pl-4 pr-2 border-t text-gray-500 fog:text-caption-m",
          keepScrollAtBottom ? "border-transparent" : "border-gray-300"
        )}
      >
        <span className="h-4 flex-1 my-1 truncate">{typingNames ? typingNames + "..." : ""}</span>

        {fetchingNewer ||
          (messages.length === 0 && !newerHistoryComplete && (
            <div className="absolute top-0 left-1/2 w-8 h-8 flex items-center justify-center -mt-4 -ml-4 p-2 rounded-full fog:box-shadow-s bg-white overflow-hidden">
              <LoadingIndicator visible={true} />
            </div>
          ))}

        <span
          onClick={jumpToBottom}
          className={classNames(
            "absolute z-10 bottom-3 right-2 flex items-center justify-center px-2.5 py-1.5 gap-x-1.5 rounded-full bg-white text-black hover:text-brand-red-500 fog:box-shadow-s fog:text-body-s cursor-pointer",
            (keepScrollAtBottom || !room) && "invisible pointer-events-none",
            !isActiveRoom && totalUnreadCount > 0 && "invisible pointer-events-none"
          )}
        >
          <span className="pl-1">Jump to recent</span>
          {hasMentions && (
            <span
              className={classNames(
                "text-base leading-none",
                isInternal ? "text-green-500" : "text-brand-orange-500"
              )}
              onClick={e => {
                e.stopPropagation();
                jumpToFirstUnreadMention();
              }}
            >
              @
            </span>
          )}
          <span
            onClick={e => {
              e.stopPropagation();
              jumpToFirstUnread();
            }}
          >
            <UnreadCircle
              total={totalUnreadCount}
              asMention={hasMentions}
              isInternal={isInternal}
            />
          </span>
        </span>
      </div>

      <div
        className={classNames(
          "absolute z-10 top-14 left-0 right-0 mt-1 flex items-center justify-center",
          (isActiveRoom || totalUnreadCount === 0) && "invisible pointer-events-none"
        )}
      >
        <span
          onClick={jumpToFirstUnread}
          className={classNames(
            "flex items-center gap-x-1 px-3 py-1.5 rounded-full text-white fog:text-caption-l leading-none cursor-pointer",
            isInternal ? "bg-green-500" : "bg-brand-orange-500"
          )}
        >
          <span>New messages</span>
          {hasMentions && (
            <span
              onClick={e => {
                e.stopPropagation();
                jumpToFirstUnreadMention();
              }}
            >
              @
            </span>
          )}
          {totalUnreadCount > 0 && (
            <span className="border border-white px-1.5 py-0.5 rounded-full fog:text-caption-s leading-snug">
              {totalUnreadCount > 1000 ? "1k+" : totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </span>
          )}
        </span>
      </div>

      {fileInput}

      {((agentRole !== "reader" && !inViolation) || isInternal) && (
        <div ref={roomFooterRef}>
          {Textarea}
          {(!mode || mode === "Reply" || mode === "Edit") && (
            <FileUploadPreview
              roomId={roomId}
              fileUploadAtom={fileUploadAtom}
              deleteFileIdsAtom={deletedFileIdsAtom}
              editingMessage={
                selectedSingleMessageId && mode === "Edit"
                  ? messages.find(m => m.id === selectedSingleMessageId)
                  : undefined
              }
              isTextAreaEmpty={(textareaRef?.current?.value || "").length === 0}
            />
          )}
        </div>
      )}

      {showForward && selection.length > 0 && (
        <Modal onClose={() => setShowForward(false)}>
          <MessageForward
            fromRoomId={roomId}
            userId={ourId}
            helpdeskId={helpdeskId}
            workspaceId={workspaceId}
            vendorId={vendorId}
            selection={selection}
            isInternal={isInternal === true}
            messagesByTarget={messagesByTarget}
            messageCreateMany={messageCreateMany}
            onComplete={onForwardCompletion}
          />
        </Modal>
      )}

      {showFileIssue && selection.length > 0 && (
        <Modal restricted={false} onClose={() => setShowFileIssue(false)}>
          <div className="max-w-[620px]">
            <FileIssue
              room={room}
              fromRoomId={roomId}
              helpdeskId={helpdeskId}
              workspaceId={workspaceId}
              vendorId={vendorId}
              selection={selection}
              isInternal={isInternal === true}
              messagesByTarget={messagesByTarget}
              messageCreateMany={messageCreateMany}
              onComplete={onForwardCompletion}
              issueTrackerIntegrations={issueTrackerIntegrations}
            />
          </div>
        </Modal>
      )}

      {!singleRoomMode && <RoomResizeHandle isActiveRoom={isActiveRoom} isInternal={isInternal} />}
    </div>
  );
};

export const RoomResizeHandle: React.FC<{ isActiveRoom?: boolean; isInternal?: boolean }> = ({
  isActiveRoom,
  isInternal,
}) => {
  return (
    <div className="absolute right-0 bottom-0 w-4 h-4 rounded-lg">
      <div className="w-full h-full overflow-hidden">
        <div
          className={classNames(
            "w-full h-full transform origin-bottom-left rotate-45 scale-150",
            isActiveRoom ? (isInternal ? "bg-green-500" : "bg-brand-orange-500") : "bg-gray-300"
          )}
        />
      </div>
    </div>
  );
};

const PinnedMessageComponent: React.FC<{
  pin: PinTag;
  roomId: string;
  serverCall: ServerCall;
}> = ({ pin, roomId, serverCall }) => {
  const { messageId: pinnedMessageId, isPrivate } = pin;
  const [pinnedMessage, setPinnedMessage] = React.useState<Message>();

  const { data: fetchMessages } = useQuery(
    ["pinnedMessageId", pinnedMessageId, pinnedMessage],
    async () => {
      if (pinnedMessage === undefined && pinnedMessageId) {
        const res = await serverCall<StreamGet>({
          msgType: "Stream.Get",
          topic: `room/${roomId}/messages`,
          aroundId: pinnedMessageId,
          limit: 1,
        });
        if (res.msgType === "Stream.GetOk") {
          const items = extractEventMessage(res.items);
          const message = items.map(convertEventMessageToMessage);
          return message;
        }
      }
      return;
    },
    {
      staleTime: Infinity,
    }
  );

  if (fetchMessages !== undefined) {
    setPinnedMessage(fetchMessages.find(x => x.id === pinnedMessageId));
  }

  return (
    <React.Fragment>
      {pinnedMessage ? (
        <Pin isPrivate={isPrivate} pinnedMessage={pinnedMessage} />
      ) : (
        <div className="pt-2 pb-2 bg-gray-200">
          <div className="ml-3 text-gray-500">
            <Icons.SpinnerSmall className="h-4" />
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

const Pin: React.FC<{
  pinnedMessage: Message;
  isPrivate?: boolean;
}> = ({ pinnedMessage, isPrivate = false }) => {
  const title = isPrivate ? "Private pin - visible only to you" : "Public pin - visible to all";

  const images = pinnedMessage?.files.filter(
    file => "fileUrl" in file && file.type === "attachment:image"
  );

  const files = pinnedMessage?.files.filter(
    file => "fileUrl" in file && file.type !== "attachment:image"
  );

  const { updateLoadAround } = useLoadAround();

  const onClick = (e: { stopPropagation: () => void }) => {
    if (pinnedMessage) {
      e.stopPropagation();
      updateLoadAround(pinnedMessage.roomId, pinnedMessage.id);
    }
  };

  return (
    <button
      className={classNames(
        "h-8",
        "group",
        "bg-gray-200 text-sm",
        "flex gap-1 items-center",
        !pinnedMessage && "text-gray-100"
      )}
      onClick={onClick}
      title={title}
    >
      <div className="flex items-center">
        <span className={pinnedMessage ? "pl-2 text-gray-500 group-hover:text-gray-800" : "hidden"}>
          {isPrivate ? <Icons.PinMe className="w-5" /> : <Icons.Pin className="w-5" />}
        </span>
        <span className="pl-1.5 flex-none fog:text-chat-username-s">
          {pinnedMessage.author.name}
        </span>
        {pinnedMessage.author.type === "agent" && (
          <span className={pinnedMessage ? "pl-1 text-gray-500" : "hidden"}>
            <Icons.AgentMark />
          </span>
        )}
      </div>
      {images && images.length > 0 && pinnedMessage && (
        <div className="flex p-1 gap-x-2">
          {images.map((image, i) => (
            <MessageFileThumbnail
              key={i}
              id={`${pinnedMessage.id}:${image.id}`}
              roomId={pinnedMessage.roomId}
              attachment={image}
              name={image.filename || ""}
              fileSize={image.fileSize}
              thumbnail={
                image.thumbnail
                  ? {
                      url: image.thumbnail.url,
                      width: 35,
                      height: 35,
                      original_width: 35,
                      original_height: 35,
                    }
                  : undefined
              }
              isImage={image.thumbnail !== undefined}
              inPin={true}
            />
          ))}
        </div>
      )}
      {files &&
        files.map(file => (
          <div key={file.id} className="py-2 px-1 truncate">
            File upload: <b>{file.filename}</b>
          </div>
        ))}
      <span className="py-2 px-1 truncate text-left flex-1">
        {pinnedMessage.sources && pinnedMessage.linkType === "forward"
          ? `Forwarded: ${pinnedMessage?.sources[0].plainText}`
          : pinnedMessage.plainText}
      </span>
    </button>
  );
};

type PinTag = {
  messageId: string;
  isPrivate: boolean;
};
