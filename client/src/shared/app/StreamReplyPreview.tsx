import classNames from "classnames";
import { type Author, type Room as RoomT, useStreamReply, useRoomHistory } from "fogbender-proto";

import { isInternalHelpdesk } from "../utils/format";

import { MessageView } from "../messages/MessageView";

import { sanitize, toFinalHtml } from "../messages/utils";

import { RoomResizeHandle } from "./Room";
import { RoomHeader } from "./RoomHeader";

export const StreamReplyPreview = ({
  roomId,
  messageId,
  paneId,
  isAgent,
  myAuthor,
  singleRoomMode,
  activeRoomId,
  isLayoutPinned,
  isExpanded,
  roomById,
  onClose,
  onCloseOtherRooms,
  onSetRoomPin,
  rosterVisible,
}: {
  roomId: string;
  messageId: string;
  paneId: string;
  isAgent?: boolean;
  myAuthor: Author;
  singleRoomMode?: boolean;
  activeRoomId?: string;
  isLayoutPinned: boolean;
  isExpanded: boolean;
  roomById: (id: string) => RoomT | undefined;
  onClose: (id: string) => void;
  onCloseOtherRooms: (id?: string) => void;
  onSetRoomPin: (roomId: string | undefined, pinned: boolean) => void;
  rosterVisible?: boolean;
}) => {
  const room = roomById(roomId);
  const isInternal = isInternalHelpdesk(room?.customerName);
  const isActiveRoom = activeRoomId === paneId;
  const { streamReply } = useStreamReply({ roomId });
  const { messages } = useRoomHistory({
    userId: "",
    roomId,
    aroundId: messageId,
  });

  const sourceMessage = messages.find(m => m.id === messageId);
  const targetMessage = sourceMessage?.targets?.[0];

  const rawReply = streamReply[messageId];

  const sanitized = rawReply && sanitize(rawReply);

  const finalHtml = sanitized && toFinalHtml(sanitized);

  return (
    <div
      className={classNames(
        "relative flex h-full flex-col justify-end overflow-hidden bg-white focus:outline-none",
        "dark:bg-brand-dark-bg",
        singleRoomMode
          ? "sm:border-l sm:px-2"
          : [
              "sm:rounded-lg sm:border",
              isActiveRoom
                ? isInternal
                  ? "border-green-500"
                  : "border-brand-orange-500"
                : "border-transparent",
              isInternal
                ? "fog:box-shadow-m-green"
                : isActiveRoom
                ? "fog:box-shadow-m-brand-orange"
                : "fog:box-shadow-m",
            ]
      )}
    >
      {room && (
        <RoomHeader
          room={room}
          roomId={roomId}
          paneId={paneId}
          mode="StreamReplyPreview"
          helpdesk={undefined}
          isAgent={isAgent}
          myAuthor={myAuthor}
          singleRoomMode={singleRoomMode || false}
          isActive={singleRoomMode || activeRoomId === paneId}
          isLayoutPinned={isLayoutPinned}
          isExpanded={isExpanded}
          isDraggable={!singleRoomMode}
          onClose={onClose}
          onCloseOtherRooms={onCloseOtherRooms}
          onSetRoomPin={onSetRoomPin}
          rosterVisible={rosterVisible}
        />
      )}

      <div
        className={classNames("flex flex-1 flex-col justify-start overflow-x-hidden text-black")}
      >
        <div className="fbr-scrollbar overflow-auto">
          {finalHtml ? (
            <div
              className="pl-8 pt-8 pb-8 break-words fog:chat-message fog:text-body-m dark:text-white"
              dangerouslySetInnerHTML={{ __html: finalHtml }}
            />
          ) : (
            (targetMessage ? [targetMessage] : []).map(msg => (
              <MessageView
                key={msg.id}
                message={msg as any}
                prevMessage={undefined}
                nextMessage={undefined}
                isLast={false}
                isFirst={false}
                onMessageClick={undefined}
                selected={false}
                selectedSingle={false}
                flipTagHighlight={() => {}}
                highlightedTags={[]}
                roomById={roomById}
                inInternalRoom={isInternal || false}
                messageUpdate={() => {}}
                setReaction={() => {}}
                // sourceMessages={messagesByTarget[replyMessage.id]}
                sourceMessages={sourceMessage ? [sourceMessage] : []}
                onMessageRef={undefined}
                highlight={undefined}
                newMessagesAtId={undefined}
                newMessagesIsDimmed={false}
                allowForward={false}
                allowFileIssue={false}
                allowDelete={false}
                showAiHelper={false}
                isPending={false}
                pendingMessageActions={undefined}
                // myAuthor={myAuthor}
                myAuthor={undefined}
                cancelSelection={() => {}}
                inDialog={false}
                isSearchView={true}
              />
            ))
          )}
        </div>
      </div>

      {!singleRoomMode && <RoomResizeHandle isActiveRoom={isActiveRoom} isInternal={isInternal} />}
    </div>
  );
};
