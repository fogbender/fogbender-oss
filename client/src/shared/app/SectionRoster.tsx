import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import {
  calculateCounterpart,
  calculateStartPosFast,
  EventBadge,
  EventRoom,
  EventRosterRoom,
  EventRosterSection,
  RosterSectionActions,
  RosterSectionId,
  useRosterSections,
} from "fogbender-proto";
import { useAtomValue } from "jotai";
import React from "react";

import { Icons } from "../components/Icons";
import { Avatar, UnreadCircle } from "../components/lib";
import {
  formatCustomerName,
  formatRoomName,
  isExternalHelpdesk,
  isInternalHelpdesk,
} from "../utils/format";
import { formatRosterTs } from "../utils/formatTs";

import { viewIdAtom } from "./Folders";
import { LayoutOptions } from "./LayoutOptions";

export const SectionRoster: React.FC<{
  selectedSectionId: string | undefined;
  openRoomIds: string[];
  activeRoomId: string | undefined;
  onRosterRoomClick: (room: EventRoom, opts: LayoutOptions) => void;
  onRoomSettingsClick: (id: string) => void;
  userId: string | undefined;
  isAgent: boolean;
  searching: boolean;
}> = ({
  selectedSectionId,
  openRoomIds,
  activeRoomId,
  onRosterRoomClick,
  onRoomSettingsClick,
  userId,
  isAgent,
  searching,
}) => {
  const viewId = useAtomValue(viewIdAtom);

  const { rosterSections, dispatch } = useRosterSections(viewId);

  const [openedRosterSections, setOpenedRosterSections] = React.useState<
    Partial<Record<RosterSectionId, boolean>>
  >({
    "PINNED": true,
    "ASSIGNED TO ME": true,
    "OPEN": true,
    "INBOX": true,
    "PRIVATE": true,
  });

  React.useEffect(() => {
    rosterSections.forEach(section => {
      if (section && section.unreadCount > 0 && openedRosterSections[section.id] === undefined) {
        setOpenedRosterSections(sections => ({ ...sections, [section.id]: true }));
      }
    });
  }, [rosterSections, openedRosterSections]);

  const section = Array.from(rosterSections.values()).find(
    (section: EventRosterSection & { room?: EventRosterRoom[] }) => section.id === selectedSectionId
  );

  if (!section) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <RoomSection
        key={section.id}
        dispatchRosterSection={dispatch}
        section={section}
        searching={searching}
        openRoomIds={openRoomIds}
        activeRoomId={activeRoomId}
        onRosterRoomClick={onRosterRoomClick}
        onRoomSettingsClick={onRoomSettingsClick}
        isAgent={isAgent}
        userId={userId}
      />
    </div>
  );
};

type RoomSectionProps = {
  dispatchRosterSection: (update: RosterSectionActions) => void;
  section: EventRosterSection & { rooms?: EventRosterRoom[] };
  searching: boolean;
  openRoomIds: string[];
  activeRoomId: string | undefined;
  onRosterRoomClick: (room: EventRoom, opts: LayoutOptions) => void;
  onRoomSettingsClick: (id: string) => void;
  isAgent: boolean;
  userId: string | undefined;
};

const RoomSection = (props: RoomSectionProps) => {
  const {
    dispatchRosterSection: dispatch,
    section,
    searching,
    openRoomIds,
    activeRoomId,
    onRosterRoomClick,
    onRoomSettingsClick,
    isAgent,
    userId,
  } = props;
  const parentRef = React.useRef<HTMLDivElement>(null);
  const margin = 4;
  const rowVirtualizer = useVirtualizer({
    count: section.count || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 55.5 + margin,
    paddingEnd: -margin,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  {
    const lastVisibleNum = 1 + (virtualItems[virtualItems.length - 1]?.index || 0);
    const sectionRoomsLength = calculateStartPosFast(section) - 1;
    const needsToFetch = lastVisibleNum >= sectionRoomsLength;
    const canFetchMore = section.count > sectionRoomsLength;
    const fetchKey = `${section.id}:${section.count}:${lastVisibleNum}:${sectionRoomsLength}`;
    const prevFetchKey = React.useRef("");
    const willFetchMore = needsToFetch && canFetchMore && fetchKey !== prevFetchKey.current;
    const isFetching = React.useRef(false);
    React.useEffect(() => {
      if (willFetchMore && !isFetching.current) {
        isFetching.current = true;
        prevFetchKey.current = fetchKey;
        dispatch({
          action: "load",
          sectionId: section.id,
          view: section.view,
          done: () => (isFetching.current = false),
        });

        console.info(
          "fetch more items starting from",
          lastVisibleNum,
          "because we only have",
          sectionRoomsLength,
          "out of",
          section.count
        );
      }
    });
  }

  return (
    <React.Fragment>
      <div ref={parentRef} className="flex-1 fbr-scrollbar overflow-y-scroll">
        {(section.rooms?.length || 0) === 0 && (
          <p className="flex items-center justify-center px-1 py-2 text-center fog:text-caption-xl">
            <span>{searching ? "Not found" : "No issues"}</span>
          </p>
        )}
        <div
          className="my-2"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map(virtualItem => {
            const { room, badge } = section.rooms?.[virtualItem.index] || {};
            const element = room ? (
              <RoomItem
                room={room}
                opened={openRoomIds.includes(room.id)}
                active={activeRoomId === room.id}
                onClick={onRosterRoomClick}
                onSettingsClick={onRoomSettingsClick}
                badge={badge ?? undefined}
                isAgent={isAgent}
                userId={userId}
              />
            ) : (
              `Loading... ${virtualItem.index}`
            );
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {element}
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
};

const RoomItemBadge: React.FC<{
  showAsInternal: boolean;
  isDialog: boolean;
  unreadCount?: number;
  unreadMentionsCount?: number;
}> = ({ showAsInternal, isDialog, unreadCount, unreadMentionsCount }) => {
  return unreadCount !== undefined && unreadCount > 0 ? (
    <>
      {unreadMentionsCount !== undefined && unreadMentionsCount > 0 && (
        <span className={classNames(showAsInternal ? "text-green-500" : "text-brand-orange-500")}>
          <Icons.Mention className="w-3 h-3" />
        </span>
      )}
      <UnreadCircle total={unreadCount} isDialog={isDialog} isInternal={showAsInternal} />
    </>
  ) : null;
};

export const RoomItem: React.FC<{
  room: EventRoom;
  opened: boolean;
  active: boolean;
  onClick: (room: EventRoom, opts: LayoutOptions) => void;
  onSettingsClick: (id: string) => void;
  badge: EventBadge | undefined;
  isAgent: boolean | undefined;
  userId: string | undefined;
}> = ({ room, opened, active, onClick, onSettingsClick, badge, isAgent, userId }) => {
  const counterpart = calculateCounterpart(room, userId);
  const roomName = formatRoomName(room, isAgent === true, counterpart?.name);

  const unreadCount = badge?.count;
  const unreadMentionsCount = badge?.mentionsCount;
  const latestMessageText = badge?.lastRoomMessage?.plainText;
  const latestMessageAuthor = (badge?.lastRoomMessage?.fromName || "").split(/\s+/)[0];
  const showAsInternal = isInternalHelpdesk(room.customerName);
  const isExternal = isExternalHelpdesk(room.customerName);
  const resolved = room.resolved;

  return (
    <div
      className={classNames(
        "group w-full relative mb-1 pt-1 pb-3 pl-1 pr-2 border-l-5 rounded-r-md cursor-pointer hover:z-10",
        !opened && "border-transparent hover:border-gray-300",
        showAsInternal ? "hover:border-green-500" : "hover:border-brand-orange-500",
        opened && showAsInternal && "bg-green-50",
        opened && showAsInternal && active && "border-green-500",
        opened && showAsInternal && !active && "border-green-100",
        opened && !showAsInternal && "bg-blue-50",
        opened && !showAsInternal && active && "border-brand-orange-500",
        opened && !showAsInternal && !active && "border-blue-200"
      )}
      data-key={room.id}
      onClick={e => onClick(room, { forceFullscreen: e.metaKey || e.ctrlKey })}
    >
      {isAgent && (
        <div className="flex items-center space-x-1 fog:text-caption-xl truncate">
          <div className="flex-1 flex flex-col truncate text-gray-600">
            {formatCustomerName(room.customerName)}
          </div>
          {isAgent && !resolved && (
            <div>
              <div title="Unresolved" className="w-2 h-2 rounded-full bg-brand-purple-500" />
            </div>
          )}
          {isAgent && (
            <RoomItemBadge
              showAsInternal={showAsInternal}
              isDialog={room.type === "dialog"}
              unreadCount={unreadCount}
              unreadMentionsCount={unreadMentionsCount}
            />
          )}
        </div>
      )}
      <div className="flex items-center space-x-1">
        {room.type === "dialog" && (
          <Avatar url={counterpart?.imageUrl} name={counterpart?.name} size={20} />
        )}
        {room.type === "private" && isExternal === false && (
          <span className="py-0.5 px-1.5 rounded-xl bg-gray-800 text-white fog:text-caption-xs">
            Private
          </span>
        )}

        <span className="flex-1 flex flex-col fog:text-body-m truncate">
          <span
            className={classNames(showAsInternal && "text-green-500", "leading-snug truncate")}
            title={roomName}
          >
            {roomName}
          </span>
        </span>
        {!isAgent && (
          <RoomItemBadge
            showAsInternal={showAsInternal}
            isDialog={room.type === "dialog"}
            unreadCount={unreadCount}
            unreadMentionsCount={unreadMentionsCount}
          />
        )}
      </div>
      <div
        className={classNames(
          "flex items-center space-x-1 mt-1.5 fog:text-body-s",
          isAgent && "hidden"
        )}
      >
        <span className="flex-1 truncate">
          {latestMessageText && latestMessageAuthor && (
            <>
              <b className="fog:text-chat-username-s">{latestMessageAuthor}</b>: {latestMessageText}
            </>
          )}

          {!(latestMessageText && latestMessageAuthor) && (room.isTriage || isExternal) && (
            <span className="text-gray-500">☝️ Start here</span>
          )}
        </span>
        <span className="text-gray-500 whitespace-no-wrap fog:text-body-s">
          {formatRosterTs(badge?.lastRoomMessage?.createdTs || room.createdTs)}
        </span>
      </div>
      {isAgent && room.type !== "dialog" && (
        <div className="absolute right-0 bottom-0 -mb-1 mr-1 opacity-100 sm:opacity-0 group-hover:opacity-100">
          <span
            className="flex py-1 px-2 items-center bg-white rounded-full text-gray-500 hover:text-gray-800 fog:box-shadow-s fog:text-body-s leading-none"
            onClick={e => {
              e.stopPropagation();
              onSettingsClick(room.id);
            }}
          >
            <Icons.Gear className="w-4" />
          </span>
        </div>
      )}
    </div>
  );
};
