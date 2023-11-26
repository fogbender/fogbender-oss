import classNames from "classnames";
import {
  type Author,
  type Room as RoomT,
  useLoadAround,
  useRoomHistory,
  useSearchHistory,
} from "fogbender-proto";
import React from "react";
import { throttle } from "throttle-debounce";

import { FilterInput } from "../components/lib";
import { MessageView } from "../messages/MessageView";
import { isInternalHelpdesk } from "../utils/format";

import { RoomResizeHandle } from "./Room";
import { RoomHeader } from "./RoomHeader";

export const Search: React.FC<{
  roomId: string;
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
}> = ({
  roomId,
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
}) => {
  const room = roomById(roomId);
  const isInternal = isInternalHelpdesk(room?.customerName);
  const isActiveRoom = activeRoomId === paneId;
  const { loadAroundByRoom } = useLoadAround();
  const loadAroundMessage = loadAroundByRoom[roomId];
  const { messagesByTarget } = useRoomHistory({
    userId: "",
    roomId,
    aroundId: loadAroundMessage?.messageId,
  });
  const [searchTerm, setSearchTerm] = React.useState<string>();
  const throttled = React.useMemo(
    () => throttle(500, (cb: (v: string) => void, v: string) => cb(v)),
    []
  );
  React.useEffect(() => {
    throttled(setSearchTerm, searchTerm || "");
  }, [searchTerm, setSearchTerm, throttled]);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  const result = useSearchHistory(searchTerm || "", roomId);
  const filteredResults = result?.filter(msg => msg.deletedTs === null);

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
          mode="Search"
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
        <form onSubmit={onSearch} className={classNames("mx-2 bg-white", "dark:bg-brand-dark-bg")}>
          <FilterInput
            placeholder="Search terms"
            value={searchTerm}
            setValue={setSearchTerm}
            focusOnMount={true}
          />
        </form>
        <div className="fbr-scrollbar overflow-auto">
          {filteredResults &&
            searchTerm &&
            filteredResults.map(msg => (
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
                sourceMessages={messagesByTarget[msg.id]}
                // sourceMessages={[]}
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
            ))}
        </div>
      </div>

      {!singleRoomMode && <RoomResizeHandle isActiveRoom={isActiveRoom} isInternal={isInternal} />}
    </div>
  );
};
