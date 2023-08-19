import classNames from "classnames";
import DOMPurify from "dompurify";
import {
  Attachment,
  Author,
  Message as MessageT,
  MessageUpdate,
  Room as RoomT,
  useLoadAround,
} from "fogbender-proto";
import "highlight.js/lib/common";
import "highlight.js/styles/base16/decaf.css";
import React from "react";
import { rehype } from "rehype";
import rehypeHighlight from "rehype-highlight";

import { ClipboardCopy } from "../components/ClipboardCopy";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Icons } from "../components/Icons";
import { Avatar, MessageCheckbox } from "../components/lib";
import { UserInfoCard } from "../components/UserInfoCard";
import { formatCustomerName } from "../utils/format";
import { useClickOutside } from "../utils/useClickOutside";

import { MessageFileThumbnail } from "./MessageFileThumbnail";
import { AddMessageReaction, EmojiPicker, MessageReactions } from "./MessageReactions";
import { NewMessagesBelowIndicator } from "./NewMessagesBelowIndicator";
import { NoActivityIndicator } from "./NoActivityIndicator";
import { dayjs, formatTs, isTsCloseEnough } from "./times";

type MessageViewProps = {
  message: MessageT;
  prevMessage: MessageT | undefined;
  nextMessage: MessageT | undefined;
  inDialog: boolean;
  isLast: boolean;
  isFirst: boolean;
  onMessageClick: ((message: MessageT) => void) | undefined;
  onMarkMessageUnread?: (message: MessageT) => void;
  onMessageExpand?: () => void;
  selected: boolean;
  selectedSingle: boolean;
  selectionCount?: number;
  isLastSelected?: boolean;
  flipTagHighlight: (tag: string) => void;
  highlightedTags: string[];
  roomById: (id: string) => RoomT | undefined;
  inInternalRoom: boolean;
  messageUpdate: (message: MessageUpdate) => void;
  setReaction: (messageId: string, reaction?: string) => void;
  sourceMessages?: MessageT[];
  onMessageRef: ((instance: HTMLDivElement | null) => void) | undefined;
  highlight?: boolean;
  newMessagesAtId: string | undefined;
  newMessagesIsDimmed: boolean;
  allowForward: boolean;
  allowFileIssue: boolean;
  showAiHelper: boolean;
  allowDelete: boolean;
  isPending?: boolean;
  pendingMessageActions?: (action: "retry" | "discard") => void;
  myAuthor?: Author;
  onOpenDialog?: (messageAuthorId: string, messageAuthorType: string) => void;
  cancelSelection: () => void;
  isSearchView?: boolean;
  nonInteractive?: boolean;
  doForward?: (value: boolean) => void;
  doFileIssue?: (value: boolean) => void;
  roomId?: string;
  pinToRoom?: (isPinned: boolean, roomId: string, tag: string) => void;
  askAi?: () => void;
};

export const MessageView: React.FC<MessageViewProps> = React.memo(props => {
  const {
    message,
    prevMessage,
    nextMessage,
    inDialog,
    isFirst,
    onMessageClick,
    onMarkMessageUnread,
    onMessageExpand,
    selected,
    selectedSingle,
    isLastSelected,
    flipTagHighlight,
    highlightedTags,
    roomById,
    inInternalRoom,
    messageUpdate,
    sourceMessages,
    onMessageRef,
    highlight,
    newMessagesAtId,
    newMessagesIsDimmed,
    allowForward,
    allowFileIssue,
    allowDelete,
    showAiHelper,
    isPending,
    pendingMessageActions,
    myAuthor,
    onOpenDialog,
    cancelSelection,
    isSearchView,
    nonInteractive,
    doForward,
    doFileIssue,
    roomId,
    pinToRoom,
    askAi,
  } = props;

  const { id, tags, targets, linkStartMessageId, linkEndMessageId, linkRoomId, linkType } = message;

  const [showBalloon, setShowBalloon] = React.useState(false);

  const sourceLinkRoom = linkRoomId ? roomById(linkRoomId) : undefined;

  const { updateLoadAround } = useLoadAround();

  const nextTs = nextMessage?.createdTs;
  let humanTsDiff: string | undefined;

  const tsDiff = dayjs.duration(
    (nextTs || dayjs().valueOf() * 1000) / 1000 - message.createdTs / 1000
  );
  if (tsDiff.asMinutes() > 15 && !isPending) {
    humanTsDiff = tsDiff.humanize(false);
  }

  const isContiguous =
    !isSearchView &&
    prevMessage?.author.id === message.author.id &&
    prevMessage?.fromNameOverride === message.fromNameOverride &&
    isTsCloseEnough(message.createdTs, prevMessage?.createdTs);

  const isLastInContiguousBlock =
    !nextMessage ||
    nextMessage.author.id !== message.author.id ||
    nextMessage.fromNameOverride !== message.fromNameOverride ||
    !isTsCloseEnough(message.createdTs, nextMessage.createdTs);

  const curLinkTargetMessageIds = (message.targets || [])
    .filter(l => roomById(l.roomId))
    .map(l => l.id);
  const nextLinkTargetMessageIds = (nextMessage?.targets || [])
    .filter(l => roomById(l.roomId))
    .map(l => l.id);

  // all target message ids not present in next message targets
  const linkTerminals = curLinkTargetMessageIds.filter(
    id => !nextLinkTargetMessageIds.includes(id)
  );

  const forwards = React.useMemo(
    () =>
      (targets &&
        targets.length > 0 &&
        linkTerminals.filter(x => {
          const link = targets.find(l => l.id === x);
          const targetRoom = link && link.roomId && roomById(link.roomId);
          return link && link.linkType === "forward" && targetRoom;
        })) ||
      [],
    [targets, linkTerminals, roomById]
  );

  const replies = React.useMemo(
    () =>
      (targets &&
        targets.length > 0 &&
        linkTerminals.filter(x => {
          const link = targets.find(l => l.id === x);
          const targetRoom = link && link.roomId && roomById(link.roomId);
          return link && link.linkType === "reply" && targetRoom;
        })) ||
      [],
    [targets, linkTerminals, roomById]
  );

  const [linkTerminalsExpanded, setLinkTerminalsExapanded] = React.useState(false);

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const noActivityIndicator =
    humanTsDiff && !isSearchView
      ? NoActivityIndicator({
          id: message.id,
          duration: humanTsDiff,
          isLast: nextMessage === undefined,
        })
      : nextMessage !== undefined
      ? undefined
      : !isSearchView && !nonInteractive
      ? NoActivityIndicator({ id: message.id, hidden: true, isLast: true })
      : undefined;

  const newMessagesBelowIndicator =
    message.id === newMessagesAtId
      ? NewMessagesBelowIndicator({ id: message.id, dimmed: newMessagesIsDimmed })
      : undefined;

  const topRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const componentHeight = React.useRef(0);

  const url = window.location.href;
  const isAgent = myAuthor?.type === "agent";

  React.useLayoutEffect(() => {
    if (!topRef.current || !bottomRef.current) {
      return;
    }

    const newHeight =
      bottomRef.current.getBoundingClientRect().top - topRef.current.getBoundingClientRect().top;

    if (newHeight !== componentHeight.current) {
      onMessageExpand?.();
      componentHeight.current = newHeight;
    }
  });

  React.useLayoutEffect(() => {
    if (highlight) {
      requestAnimationFrame(() => topRef.current?.scrollIntoView());
    }
  }, [highlight]);

  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!nonInteractive) {
        updateLoadAround(message.roomId, message.id);
      }
    },
    [message, updateLoadAround]
  );

  return (
    <React.Fragment>
      <div ref={topRef} />
      {newMessagesBelowIndicator}
      <div
        className={classNames(
          "fog:chat-message relative my-1 border-transparent text-black fog:text-body-m",
          nonInteractive ? "ml-0 border-l-0" : "ml-2 border-l-5",
          !selected && !nonInteractive && "hover:border-gray-300",
          isFirst && "mt-auto",
          tags && tags.some(t => highlightedTags.includes(t)) && "bg-red-200",
          highlight && "bg-yellow-100",
          isSearchView && !nonInteractive && "cursor-pointer"
        )}
        key={id}
        ref={onMessageRef}
        id={id}
        onClick={isSearchView ? onClick : undefined}
      >
        <div
          className={classNames(
            "selector group flex absolute inset-y-0 -left-4 w-12 border-l-3 border-transparent",
            !nonInteractive && "cursor-pointer"
          )}
          onClick={onMessageClick ? () => onMessageClick(message) : undefined}
        >
          <div
            className={classNames(
              "absolute left-2 inset-y-0 w-0 border-l-5",
              selected
                ? inInternalRoom
                  ? "border-green-500"
                  : "border-brand-orange-500"
                : "border-transparent"
            )}
          />
          <div
            className={classNames(
              isPending && "hidden",
              "absolute z-10 w-4 h-4 top-1/2 left-0 -mt-2 ml-0 border-l-3 border-transparent opacity-0 group-hover:opacity-100",
              inInternalRoom ? "text-green-500" : "text-brand-orange-500"
            )}
          >
            {!isSearchView && <MessageCheckbox checked={selected} />}
          </div>
          <div className="h-full w-full flex flex-col justify-end">
            {isLastInContiguousBlock && (
              <span className="flex flex-shrink-0 self-end mr-1">
                <Avatar
                  url={message.fromAvatarUrlOverride ?? message.author.avatarUrl}
                  name={message.fromNameOverride ?? message.author.name}
                  size={25}
                />
              </span>
            )}
          </div>
        </div>

        {(!isContiguous || linkType === "reply") && (
          <div
            className={classNames("flex items-center ml-8 mb-1 mt-4", isPending && "opacity-50")}
            onMouseLeave={() => setShowBalloon(false)}
          >
            <span className="flex-1 flex items-center truncate gap-1">
              <span
                className={classNames(
                  "truncate fog:text-chat-username-m",
                  !nonInteractive && "hover:text-blue-500 cursor-pointer"
                )}
                onClick={e => {
                  e.stopPropagation();
                  setShowBalloon(x => !x);
                }}
              >
                {message.fromNameOverride ?? message.author.name}
              </span>
              {message.author.type === "agent" && (
                <span className="px-1 text-gray-500" title="Agent">
                  <Icons.AgentMark />
                </span>
              )}
              {message.author.type === "app" && message.fromNameOverride && (
                <span className="text-gray-500 text-xs self-end">via</span>
              )}
              {message.author.type === "app" && message.fromNameOverride && (
                <span className="truncate fog:text-chat-username-m">{message.author.name}</span>
              )}
              {message.author.type === "app" && message.fromNameOverride && (
                <span className="text-gray-500 text-xs rounded border border-gray-400 px-1">
                  app
                </span>
              )}
            </span>
            {isAgent ? (
              <a
                href={`${url}/${message.roomId}/${message.id}`}
                onClick={e => {
                  if (!(e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                  }
                }}
              >
                <ClipboardCopy text={`${url}/${message.roomId}/${message.id}`}>
                  <span
                    className={classNames(
                      "pr-1 text-gray-500 text-right fog:text-body-s",
                      isPending && "invisible"
                    )}
                  >
                    {formatTs(message.createdTs)}
                  </span>
                </ClipboardCopy>
              </a>
            ) : (
              <span
                className={classNames(
                  "pr-1 text-gray-500 text-right fog:text-body-s",
                  isPending && "invisible"
                )}
              >
                {formatTs(message.createdTs)}
              </span>
            )}
            {!isSearchView && !nonInteractive && (
              <UserInfoCardReveal show={showBalloon}>
                <UserInfoCard
                  author={message.author}
                  onOpenClick={
                    onOpenDialog &&
                    message.author.id !== myAuthor?.id &&
                    !inDialog &&
                    (message.author.type === "user" || myAuthor?.type === "agent")
                      ? () => onOpenDialog(message.author.id, message.author.type)
                      : undefined
                  }
                />
              </UserInfoCardReveal>
            )}
          </div>
        )}

        {linkType && (
          <SourceMessages
            isAgent={isAgent}
            sourceMessages={sourceMessages}
            linkType={message.rawText === "[Broadcast]" ? "broadcast" : linkType}
            sourceLinkRoom={sourceLinkRoom}
            linkStartMessageId={linkStartMessageId}
            linkEndMessageId={linkEndMessageId}
            isSearchView={isSearchView}
            nonInteractive={nonInteractive}
          />
        )}

        {linkType !== "forward" && (
          <MessageContentMemo
            message={message}
            isPending={isPending}
            myAuthor={myAuthor}
            isContiguous={isContiguous}
          />
        )}

        {tags && tags.length !== 0 && (
          <span className="pl-8 break-normal text-gray-800 dark:text-gray-100">
            {tags.map(tag => (
              <span
                key={tag}
                className={classNames(
                  "text-gray-800 font-bold bg-gray-400 rounded-md pl-1 pr-1 mr-1 cursor-pointer",
                  highlightedTags.includes(tag) && "bg-blue-300"
                )}
                onClick={e => {
                  e.stopPropagation();
                  flipTagHighlight(tag);
                }}
              >
                {tag}
              </span>
            ))}
          </span>
        )}

        {isPending && (
          <PendingMessageIndicator
            failed={pendingMessageActions !== undefined}
            retried={message.clientId.endsWith("!")}
            onRetry={() => pendingMessageActions?.("retry")}
            onDiscard={() => pendingMessageActions?.("discard")}
          />
        )}

        {confirmDelete && (
          <ConfirmDialog
            title="Delete message?"
            onClose={() => setConfirmDelete(false)}
            onDelete={() => {
              messageUpdate({
                messageId: id,
                msgType: "Message.Update",
                linkRoomId: null,
                linkStartMessageId: null,
                linkEndMessageId: null,
                linkType: null,
              });
              setConfirmDelete(false);
            }}
          >
            This operation cannot be undone
          </ConfirmDialog>
        )}
      </div>

      {!message.deletedTs && !isSearchView && (
        <MessageReactions
          userId={myAuthor?.id}
          reactions={message.reactions}
          messageId={message.id}
          setReaction={props.setReaction}
        />
      )}

      {((selectedSingle && !message.deletedTs) || (allowForward && isLastSelected)) && (
        <div className="sticky z-10 top-2 bottom-6 right-0 max-w-min -mt-8 -mb-0.5 ml-auto flex ">
          {showAiHelper &&
            isAgent &&
            ((selectedSingle && !message.deletedTs) || (allowForward && isLastSelected)) && (
              <button
                onClick={() => askAi && askAi()}
                className={classNames(
                  "z-20 max-w-min flex px-2 py-1 rounded-full bg-white fog:box-shadow-s mr-2"
                )}
                title="Ask AI"
              >
                <div className="w-7 h-7">
                  <img
                    src="https://fog-bot-avatars.s3.amazonaws.com/ai_192.png"
                    alt="AI helper"
                    className="w-7 h-7"
                  />
                </div>
              </button>
            )}
          <div className="max-w-min flex px-2 py-1 rounded-full bg-white fog:box-shadow-s">
            <div className={classNames("h-6 mt-0.5 flex items-center")}>
              {selectedSingle && !message.deletedTs && (
                <span onClick={() => cancelSelection()}>
                  <AddMessageReaction setReaction={r => props.setReaction(message.id, r)} />
                </span>
              )}
              {selectedSingle && !message.deletedTs && (
                <EmojiPicker
                  setReaction={r => props.setReaction(message.id, r)}
                  cancelSelection={cancelSelection}
                />
              )}
              {(allowForward || allowFileIssue) && (
                <div className="flex items-center whitespace-nowrap cursor-pointer">
                  {selectedSingle && !message.deletedTs && <span className="text-gray-300">|</span>}
                  {allowForward && (
                    <span
                      title="Forward to another room"
                      onClick={() => {
                        doForward?.(true);
                      }}
                      className="flex items-center gap-x-1 px-1 text-gray-500 hover:text-brand-red-500"
                    >
                      <Icons.ArrowRightThin className="w-4 h-4" />
                      {(!selectedSingle || message.deletedTs) && (
                        <div className="flex flex-col">
                          <span className="fog:text-body-m">Forward</span>
                        </div>
                      )}
                    </span>
                  )}
                  {allowFileIssue && (
                    <span
                      title="File issue"
                      onClick={() => {
                        doFileIssue?.(true);
                      }}
                      className="flex items-center gap-x-1 px-1 text-gray-500 hover:text-brand-red-500"
                    >
                      <Icons.Exclamation className="w-4 h-4" />
                      {(!selectedSingle || message.deletedTs) && (
                        <div className="flex flex-col">
                          <span className="fog:text-body-m">File issue</span>
                        </div>
                      )}
                    </span>
                  )}
                  {!selectedSingle && (
                    <span
                      className="ml-2 text-gray-500 hover:text-gray-800 cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        cancelSelection();
                      }}
                    >
                      <Icons.XCircleFilled />
                    </span>
                  )}
                </div>
              )}
              {selectedSingle && allowDelete && (
                <div className="flex items-center text-gray-500 hover:text-brand-red-500 cursor-pointer">
                  <span className="text-gray-300">|</span>
                  <span
                    onClick={() => {
                      setConfirmDelete(true);
                    }}
                    className="flex px-1"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </span>
                </div>
              )}
              {selectedSingle && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>
                    <ToolBarMenu
                      message={message}
                      onMarkMessageUnread={onMarkMessageUnread}
                      roomById={roomById}
                      roomId={roomId}
                      userId={myAuthor?.id}
                      cancelSelection={cancelSelection}
                      pinToRoom={pinToRoom}
                    />
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {replies.length + forwards.length > 1 && !isSearchView && (
        <div
          className="flex items-center pl-10 border-l-5 border-transparent text-gray-500 fog:text-caption-s cursor-pointer"
          onClick={() => setLinkTerminalsExapanded(!linkTerminalsExpanded)}
        >
          <span
            className={classNames("inline-block transform", linkTerminalsExpanded && "rotate-90")}
          >
            <Icons.ChevronRight />
          </span>
          <span>
            {replies.length > 0 && (
              <React.Fragment>
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </React.Fragment>
            )}
            {replies.length > 0 && forwards.length > 0 && ", "}
            {forwards.length > 0 && (
              <React.Fragment>
                {forwards.length} {forwards.length === 1 ? "forward" : "forwards"}
              </React.Fragment>
            )}
          </span>
        </div>
      )}

      {targets &&
        targets.length !== 0 &&
        (linkTerminalsExpanded || linkTerminals.length === 1) &&
        linkTerminals.map(lt => {
          const link = targets.find(l => l.id === lt);
          const targetRoom = link && link.roomId && roomById(link.roomId);

          if (link && link.linkType === "forward" && targetRoom) {
            return (
              <div
                key={link.id}
                className="flex items-center pl-10 border-l-5 border-transparent text-gray-500 fog:text-body-xs cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  if (!nonInteractive && targetRoom) {
                    updateLoadAround(targetRoom.id, lt);
                  }
                }}
              >
                <span
                  className="flex-1 truncate"
                  title={`${targetRoom.counterpart?.name || targetRoom.name} (${formatCustomerName(
                    targetRoom.customerName
                  )})`}
                >
                  {link.author.name} forwarded to {targetRoom.counterpart?.name || targetRoom.name}{" "}
                  ({formatCustomerName(targetRoom.customerName)})
                </span>
                <span className="pr-1 text-gray-500 whitespace-nowrap">
                  {formatTs(link.createdTs)}
                </span>
              </div>
            );
          } else if (link && link.linkType === "reply" && targetRoom && !isSearchView) {
            return (
              <div
                key={link.id}
                className="flex items-center pl-10 border-l-5 border-transparent text-gray-500 fog:text-body-xs cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  if (!nonInteractive) {
                    updateLoadAround(targetRoom.id, lt);
                  }
                }}
              >
                <span className="flex-1 truncate">{link.author.name} replied</span>
                <span className="pr-1 text-gray-500 whitespace-nowrap">
                  {formatTs(link.createdTs)}
                </span>
              </div>
            );
          } else {
            return null;
          }
        })}

      {noActivityIndicator}
      <div ref={bottomRef} />
    </React.Fragment>
  );
});

const UserInfoCardReveal: React.FC<{ show: boolean }> = ({ show, children }) => {
  const [mounted, setMounted] = React.useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);
  React.useLayoutEffect(() => {
    const t = setTimeout(() => setVisible(show), 50);
    return () => {
      clearTimeout(t);
    };
  }, [show]);
  if (show || mounted) {
    return (
      <div
        ref={setMounted}
        className={classNames(
          "absolute z-10 top-0 -mt-24 left-4 transition delay-0 duration-300 w-11/12",
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {children}
      </div>
    );
  }
  return null;
};

const PendingMessageIndicator: React.FC<{
  failed: boolean;
  retried: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}> = ({ failed, retried, onRetry, onDiscard }) => {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);
  return (
    <div
      className={classNames(
        "absolute -top-0.5 right-1 flex items-center gap-x-1 px-2 py-1 rounded-full bg-white fog:box-shadow-s fog:text-body-s text-black",
        "delay-1000 duration-1000",
        failed
          ? "opacity-100 transition-none"
          : isMounted || retried
          ? "opacity-100 transition-opacity"
          : "opacity-0 transition-opacity"
      )}
    >
      {!failed && (
        <>
          <span>Sending</span>
          <span className="w-3 h-3 flex">
            <Icons.Spinner className="w-full" />
          </span>
        </>
      )}
      {failed && (
        <>
          <span className="text-brand-red-500">Failed to send</span>
          <span>
            <span className="fog:text-caption-m fog:text-link" onClick={onDiscard}>
              Discard
            </span>{" "}
            or{" "}
            <span className="fog:text-caption-m fog:text-link" onClick={onRetry}>
              Retry
            </span>
          </span>
        </>
      )}
    </div>
  );
};

export const SourceMessages: React.FC<{
  isAgent: boolean;
  sourceMessages?: MessageT[];
  linkType?: "forward" | "reply" | "broadcast";
  sourceLinkRoom?: RoomT;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
  isSearchView?: boolean;
  nonInteractive?: boolean;
}> = ({
  sourceMessages,
  linkType,
  linkStartMessageId,
  linkEndMessageId,
  sourceLinkRoom,
  isAgent,
  isSearchView,
  nonInteractive,
}) => {
  const { updateLoadAround } = useLoadAround();
  const sm = sourceMessages?.[0];
  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!nonInteractive && sm) {
        updateLoadAround(sm.roomId, sm.id);
      }
    },
    [sm, updateLoadAround]
  );
  const sourceRoomName = sourceLinkRoom?.counterpart?.name || sourceLinkRoom?.name;

  const url = window.location.href;

  return linkStartMessageId && linkEndMessageId && (sourceMessages?.length || 0) > 0 ? (
    <div>
      {(linkType === "broadcast" || linkType === "forward") && (
        <div
          className={classNames("pl-8 fog:text-body-s", sourceRoomName && "cursor-pointer")}
          onClick={e => {
            if (!isSearchView) {
              e.stopPropagation();
            }
            if (!nonInteractive && sourceLinkRoom && linkStartMessageId) {
              updateLoadAround(sourceLinkRoom.id, linkStartMessageId);
            }
          }}
        >
          {linkType === "broadcast" ? "Broadcast" : "Forwarded messages"}
          {sourceRoomName && (
            <React.Fragment>
              {" "}
              from <span className="font-medium">{sourceRoomName}</span> (
              {formatCustomerName(sourceLinkRoom.customerName)})
            </React.Fragment>
          )}
        </div>
      )}

      <div
        className={classNames(
          "fog:chat-message fbr-link-preview ml-8 py-1 px-2 rounded-md cursor-pointer",
          linkType === "forward" && "bg-indigo-50",
          linkType === "reply" && "bg-green-50 fog:text-body-s",
          linkType === "broadcast" && "bg-red-50"
        )}
        onClick={!isSearchView ? onClick : undefined}
      >
        {(sourceMessages || [])
          .filter((_, i) => linkType !== "reply" || i === 0)
          .map((sm, i) => {
            const prevMessage = sourceMessages ? sourceMessages[i - 1] : undefined;
            const isTsCloseEnoughToPrev = (prevMessage: MessageT) => {
              return isTsCloseEnough(sm.createdTs, prevMessage.createdTs);
            };

            const isContiguous = prevMessage
              ? prevMessage.author.id === sm.author.id &&
                prevMessage.fromNameOverride === sm.fromNameOverride &&
                isTsCloseEnoughToPrev(prevMessage)
              : false;

            return (
              <div key={sm.id + i.toString()}>
                {!isContiguous && (
                  <div className="mb-1 -mr-2 flex gap-x-1 items-center">
                    <span className="truncate fog:text-chat-username-s">{sm.author.name}</span>
                    {sm.author.type === "agent" && (
                      <span className="transform scale-75 text-gray-500" title="Agent">
                        <Icons.AgentMark />
                      </span>
                    )}
                    <span
                      className={classNames(
                        "flex-1 pr-1 text-right whitespace-nowrap fog:text-body-xs"
                      )}
                    >
                      {isAgent ? (
                        <a
                          href={`${url}/${sm.roomId}/${sm.id}`}
                          onClick={e => {
                            if (!(e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <ClipboardCopy text={`${url}/${sm.roomId}/${sm.id}`}>
                            <span className="text-gray-500">{formatTs(sm.createdTs)}</span>
                          </ClipboardCopy>
                        </a>
                      ) : (
                        <span>{formatTs(sm.createdTs)}</span>
                      )}
                    </span>
                  </div>
                )}
                <div
                  className={classNames(
                    "-ml-6 -mr-2 my-1",
                    linkType === "reply" && "truncate",
                    linkType === "reply" &&
                      (sm.deletedTs ? "max-h-8" : sm.files.length === 0 ? "max-h-4" : undefined)
                  )}
                >
                  <MessageContentMemo
                    message={sm}
                    linkType={linkType}
                    nonInteractive={nonInteractive}
                    isContiguous={isContiguous}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  ) : null;
};

const MessageContentMemo: React.FC<{
  message: MessageT;
  linkType?: MessageT["linkType"] | "broadcast";
  isPending?: boolean;
  myAuthor?: Author;
  nonInteractive?: boolean;
  isContiguous?: boolean;
}> = ({ message, linkType, isPending, myAuthor, nonInteractive, isContiguous }) => {
  return React.useMemo(
    () => (
      <MessageContent
        message={message}
        linkType={linkType}
        isPending={isPending}
        myAuthor={myAuthor}
        nonInteractive={nonInteractive}
        isContiguous={isContiguous}
      />
    ),
    [message, linkType, isPending]
  );
};

const MessageContent: React.FC<{
  message: MessageT;
  linkType?: MessageT["linkType"] | "broadcast";
  isPending?: boolean;
  myAuthor?: Author;
  nonInteractive?: boolean;
  isContiguous?: boolean;
}> = ({ message, linkType, isPending, myAuthor, nonInteractive, isContiguous }) => {
  const parsed = isPending ? unsafeHtmlEscapeForPendingMessage(message.parsed) : message.parsed;

  const parsedWithMyMention =
    parsed && myAuthor && message.mentions?.find(x => x.id === myAuthor.id)
      ? parsed.replace(
          `<b class='mention'>@${myAuthor?.name}</b>`,
          `<b class='mention my-mention'>@${myAuthor?.name}</b>`
        )
      : parsed;

  const rehypeHtml = String(
    rehype()
      .data("settings", { fragment: true })
      .use(rehypeHighlight, { detect: true })
      .processSync(parsedWithMyMention)
  );

  const finalHtml = DOMPurify.sanitize(rehypeHtml, {
    RETURN_DOM: true,
    ALLOWED_TAGS: [
      "p",
      "b",
      "i",
      "br",
      "strong",
      "em",
      "pre",
      "code",
      "a",
      "blockquote",
      "sup",
      "hr",
      "s",
      "ul",
      "ol",
      "li",
      "table",
      "th",
      "tr",
      "td",
      "caption",
      "colgroup",
      "col",
      "thead",
      "tbody",
      "tfoot",
    ],
    ALLOWED_ATTR: ["href", "target", "class"],
    ALLOW_DATA_ATTR: false,
  });

  const first = finalHtml.firstChild;
  // we have a single <p> tag
  const isSingleEmoji =
    first?.nodeName === "P" && first.nextSibling === null && first.textContent
      ? /^\p{Extended_Pictographic}$/u.test(first.textContent)
      : false;

  const images = message.files.filter(
    file => "fileUrl" in file && file.type === "attachment:image"
  );
  const documents = message.files.filter(
    file => "fileUrl" in file && file.type !== "attachment:image"
  );

  const inReply = linkType === "reply";

  const messageLength = message.rawText.length;
  let codeSnippetText = "";
  if (
    message.rawText.slice(0, 4) === "```\n" &&
    message.rawText.slice(messageLength - 4) === "\n```"
  ) {
    codeSnippetText = message.rawText.slice(4, messageLength - 4);
    if (!codeSnippetText.includes("\n")) {
      codeSnippetText = "";
    }
  }
  return (
    <div className={classNames("pl-8", isPending && "opacity-50")}>
      {message.deletedTs ? (
        <div className="flex items-center gap-x-1 text-gray-500 fog:text-body-xs">
          <span>
            <Icons.Trash />
          </span>
          <span className="flex-1 truncate">Message deleted by {message.deletedByName}</span>
          <span className="pr-1">{formatTs(message.deletedTs)}</span>
        </div>
      ) : (
        <div className={classNames("break-words", isSingleEmoji && !inReply && "text-6xl")}>
          <div
            ref={el => {
              if (el) {
                el.replaceChildren(DOMPurify.sanitize(finalHtml, { RETURN_DOM: true }));
              }
            }}
          />
          {images.length > 0 && (
            <MessageImages
              message={message}
              files={images}
              inReply={inReply}
              nonInteractive={nonInteractive}
            />
          )}
          {documents.length > 0 && (
            <MessageImages
              message={message}
              files={documents}
              inReply={inReply}
              nonInteractive={nonInteractive}
            />
          )}
          {!linkType &&
            message.updatedTs !== message.createdTs &&
            (!message.targets || message.targets.length === 0) &&
            (!message.sources || message.sources.length === 0) && (
              <div className="flex items-center gap-x-1 text-gray-500 fog:text-body-xs">
                <span>
                  <Icons.Pen />
                </span>
                <span className="flex-1 truncate">
                  Edited by {message.editedByName || "author or agent"}
                </span>
                <span className="pr-1 whitespace-nowrap">
                  {formatTs(message.editedTs || message.updatedTs)}
                </span>
              </div>
            )}
          {codeSnippetText && (
            <ClipboardCopy text={codeSnippetText}>
              <div
                className={classNames(
                  "cursor-pointer flex items-center justify-center absolute right-2 h-8 w-8 bg-white rounded-lg fog:box-shadow-s z-10",
                  "group",
                  isContiguous ? "top-2" : "top-12"
                )}
              >
                <Icons.Clipboard />
              </div>
            </ClipboardCopy>
          )}
        </div>
      )}
    </div>
  );
};

const MessageImages: React.FC<{
  message: MessageT;
  files: Attachment[];
  inReply: boolean;
  nonInteractive?: boolean;
}> = ({ message, files, inReply, nonInteractive }) => {
  return (
    <div
      className={classNames(
        "flex items-center gap-x-2 gap-y-2 mb-2 mt-2",
        inReply ? "fbr-scrollbar overflow-x-auto" : "flex-wrap"
      )}
    >
      {files.map(file => {
        return (
          <MessageFileThumbnail
            key={file.id}
            id={`${message.id}:${file.id}`}
            roomId={message.roomId}
            attachment={file}
            name={file.filename || ""}
            fileSize={file.fileSize}
            thumbnail={file.thumbnail}
            isImage={file.type === "attachment:image"}
            isSingle={file.type === "attachment:image" && files.length === 1}
            inReply={inReply}
            message={message}
            nonInteractive={nonInteractive}
          />
        );
      })}
    </div>
  );
};

const unsafeHtmlEscapeForPendingMessage = (str: string) =>
  "<p>" +
  str.replace(
    /[&<>]/g,
    char =>
      ((
        {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
        } as { [key: string]: string | undefined }
      )[char] || char)
  ) +
  "</p>";

type ToolBarMenuProps = {
  message: MessageT;
  onMarkMessageUnread?: (message: MessageT) => void;
  pinnedMessageId?: (message: string) => void;
  roomId?: string;
  roomById: (id: string) => RoomT | undefined;
  userId?: string;
  cancelSelection: () => void;
  pinToRoom?: (isPinned: boolean, roomId: string, tag: string) => void;
};

const ToolBarMenu: React.FC<ToolBarMenuProps> = React.memo(props => {
  const { message, onMarkMessageUnread, roomById, roomId, userId, cancelSelection, pinToRoom } =
    props;
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return;
  }, [copied]);
  useClickOutside(menuRef, () => setShowMenu(false), !showMenu);

  const room = roomId && roomById(roomId);

  const myPinTag = userId ? `:@${userId}:mpin:${message.id}` : undefined;
  const isPinned = (room && room?.tags?.some(t => t.name === myPinTag)) || false;

  const onPinRoom = React.useCallback(() => {
    if (!room || !myPinTag) {
      return;
    }
    const isPinned = room.tags?.some(t => t.name === myPinTag);
    if (isPinned !== undefined && pinToRoom !== undefined) {
      pinToRoom(isPinned, room.id, myPinTag);
    }
    cancelSelection();
  }, [room, myPinTag, pinToRoom]);

  const groupPinTag = `:mpin:${message.id}`;
  const isGroupPinned = (room && room?.tags?.some(t => t.name === groupPinTag)) || false;

  const onGroupPinRoom = React.useCallback(() => {
    if (!room || !groupPinTag) {
      return;
    }
    const isGroupPinned = room.tags?.some(t => t.name === groupPinTag);
    if (isGroupPinned !== undefined && pinToRoom !== undefined) {
      pinToRoom(isGroupPinned, room.id, groupPinTag);
    }
    cancelSelection();
  }, [room, groupPinTag, pinToRoom]);

  return (
    <>
      <div
        onClick={() => {
          setShowMenu(x => !x);
        }}
        className="text-gray-500 hover:text-gray-800 cursor-pointer"
      >
        <Icons.Menu className="w-4" />
      </div>
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute z-10 bottom-8 right-0 flex flex-col rounded-lg py-2 bg-white fog:box-shadow-m fog:text-body-m"
        >
          {!isGroupPinned && !isPinned && (
            <button
              className="hover:bg-gray-100 flex group items-center px-4 py-2 text-left whitespace-nowrap"
              onClick={onGroupPinRoom}
            >
              <span className="pr-2">
                <Icons.Pin className="w-6 text-gray-500 group-hover:text-gray-800" />
              </span>
              <span>Pin message for all </span>
            </button>
          )}
          {!isPinned && !isGroupPinned && (
            <button
              className="hover:bg-gray-100 flex group items-center px-4 py-2 text-left whitespace-nowrap"
              onClick={onPinRoom}
            >
              <span className="pr-2">
                <Icons.PinMe className="w-6 text-gray-500 group-hover:text-gray-800" />
              </span>
              <span>Pin only for me</span>
            </button>
          )}
          {(isPinned || isGroupPinned) && (
            <button
              className="hover:bg-gray-100 flex group items-center px-4 py-2 text-left whitespace-nowrap"
              onClick={isPinned ? onPinRoom : onGroupPinRoom}
            >
              <span className="pr-2 text-gray-500">
                <Icons.Unpin className="w-6 text-gray-500 group-hover:text-gray-800" />
              </span>
              <span>Unpin message</span>
            </button>
          )}
          <button
            className="hover:bg-gray-100 px-4 py-2 text-left whitespace-nowrap"
            onClick={() => onMarkMessageUnread?.(message)}
          >
            Mark as unread and close pane
          </button>
          <ClipboardCopy
            className="hover:bg-gray-100"
            text={`${window.location.href}/${message.roomId}/${message.id}`}
            onCopy={() => setCopied(true)}
          >
            <button className="px-4 py-2 text-left text-black w-full whitespace-nowrap">
              {!copied ? "Copy link to message" : "Copied"}
            </button>
          </ClipboardCopy>
        </div>
      )}
    </>
  );
});
