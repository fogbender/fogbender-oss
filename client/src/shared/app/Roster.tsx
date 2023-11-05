import { useVirtualizer } from "@tanstack/react-virtual";
import classNames from "classnames";
import {
  calculateCounterpart,
  calculateStartPosFast,
  type EventBadge,
  type EventRoom,
  type EventRosterRoom,
  type EventRosterSection,
  invariant,
  type RosterOpenView,
  type RosterSectionActions,
  type RosterSectionId,
  useRosterSections,
  useSharedRoster,
  useWs,
} from "fogbender-proto";
import { useAtomValue } from "jotai";
import { useUpdateAtom } from "jotai/utils";
import React from "react";
import { useQuery } from "react-query";

import { Icons } from "../components/Icons";
import { Avatar, RosterChevronButton, UnreadCircle } from "../components/lib";
import { showFocusedRosterAtom } from "../store/config.store";
import { queryKeys } from "../utils/client";
import {
  formatCustomerName,
  formatRoomName,
  isExternalHelpdesk,
  isInternalHelpdesk,
} from "../utils/format";
import { formatRosterTs } from "../utils/formatTs";

import { type LayoutOptions } from "./LayoutOptions";

export const Roster: React.FC<{
  openRoomIds: string[];
  activeRoomId: string | undefined;
  onRosterRoomClick: (room: EventRoom, opts: LayoutOptions) => void;
  onRoomSettingsClick: (id: string) => void;
  userId: string | undefined;
  isAgent: boolean;
  searching: boolean;
  isIframe: boolean;
}> = ({
  openRoomIds,
  activeRoomId,
  onRosterRoomClick,
  onRoomSettingsClick,
  userId,
  isAgent,
  searching,
  isIframe,
}) => {
  const focused = useAtomValue(showFocusedRosterAtom);
  const viewId = focused ? "focused" : "main";
  const { rosterSections, dispatch, isRosterReady } = useRosterSections(viewId);

  const [openedRosterSections, setOpenedRosterSections] = React.useState<
    Partial<Record<RosterSectionId, boolean>>
  >({
    "PINNED": true,
    "ASSIGNED TO ME": true,
    "OPEN": true,
    "INBOX": true,
    "PRIVATE": true,
  });

  const toggleRosterSection = React.useCallback(
    (section: keyof typeof openedRosterSections) => {
      if (isIframe) {
        setOpenedRosterSections(sections => {
          const newSections = { ...sections };
          Object.keys(newSections).forEach(x => (newSections[x as typeof section] = false));
          newSections[section] = !sections[section];
          return newSections;
        });
      } else {
        setOpenedRosterSections(sections => ({ ...sections, [section]: !sections[section] }));
      }
    },
    [isIframe]
  );

  React.useEffect(() => {
    rosterSections.forEach(section => {
      if (section && section.unreadCount > 0 && openedRosterSections[section.id] === undefined) {
        setOpenedRosterSections(sections => ({ ...sections, [section.id]: true }));
      }
    });
  }, [rosterSections, openedRosterSections]);

  const viewOptions = React.useMemo(
    () =>
      ({
        view: viewId,
        filters: { focused: true },
      } as RosterViewOptions),
    [viewId]
  );

  if (searching) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {focused && isRosterReady && <RosterViewSubscription options={viewOptions} />}
      {Array.from(rosterSections.values()).map(section => {
        const visible =
          section.id === "OPEN" || section.id === "INBOX" ? true : Boolean(section.count);
        if (!visible) return null;
        return (
          <RoomSection
            key={section.id}
            dispatchRosterSection={dispatch}
            section={section}
            expanded={openedRosterSections[section.id] === true}
            onClick={() => toggleRosterSection(section.id)}
            onDoubleClick={() => setOpenedRosterSections({ [section.id]: true })}
            searching={searching}
            openRoomIds={openRoomIds}
            activeRoomId={activeRoomId}
            onRosterRoomClick={onRosterRoomClick}
            onRoomSettingsClick={onRoomSettingsClick}
            isAgent={isAgent}
            userId={userId}
          />
        );
      })}
    </div>
  );
};

const sectionTitles = (
  section: EventRosterSection & { rooms?: EventRosterRoom[] },
  isAgent: boolean
) => {
  const { id: sectionId, entityType } = section;

  if (entityType === "TAG") {
    const { entity } = section;
    return entity?.name || "Unknown: " + sectionId;
  }

  return (
    {
      "OPEN": "Unassigned",
      "INBOX": "Team support",
      "PRIVATE": isAgent ? "Private conversations" : "Private",
      "PINNED": "Pinned",
      "ASSIGNED TO ME": "Assigned to me",
      "ASSIGNED": "Assigned",
      "DIRECT": "Direct",
      "ARCHIVED": "Archived",
      "CLOSED": "Closed",
      "NEW": "New customers",
      "NEW VISITOR": "New visitors",
    }[sectionId] || "Unknown: " + sectionId
  );
};

type RoomSectionProps = {
  expanded: boolean;
  dispatchRosterSection: (update: RosterSectionActions) => void;
  onClick: () => void;
  onDoubleClick: () => void;
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
    expanded,
    dispatchRosterSection: dispatch,
    onClick,
    onDoubleClick,
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
      <div
        className={classNames(
          "flex items-center gap-x-2 mt-2 p-2 pr-4 rounded-lg bg-gray-100 fog:text-caption-l uppercase cursor-pointer",
          "dark:bg-gray-900"
        )}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <RosterChevronButton isOpen={expanded} />
        <div className="flex-1">{sectionTitles(section, isAgent)}</div>
        <div className="flex items-center gap-x-1">
          <span className="text-gray-500 fog:text-body-s font-normal">{section.count}</span>
          <span className={classNames("text-gray-400", !section.mentionsCount && "hidden")}>
            <Icons.Mention />
          </span>
          <span
            className={classNames(
              section.unreadCount === 0 && section.mentionsCount === 0 && "hidden"
            )}
          >
            <UnreadCircle total={section.unreadCount || section.mentionsCount || 1} dimmed={true} />
          </span>
        </div>
      </div>
      <div
        ref={parentRef}
        className={classNames(
          expanded && !!section.rooms?.length
            ? [
                section.id === "PINNED" ||
                section.id === "ASSIGNED TO ME" ||
                section.id === "ASSIGNED"
                  ? "flex-shrink"
                  : "flex-1",
                "fbr-scrollbar overflow-y-scroll",
              ]
            : "max-h-0 overflow-hidden"
        )}
        style={expanded ? { minHeight: "4rem" } : undefined}
      >
        {(section.rooms?.length || 0) === 0 && (
          <p className="flex items-center justify-center px-1 py-2 text-center fog:text-caption-xl text-gray-400 !font-light">
            <span>{searching ? "No matches" : "🕺"}</span>
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
  return (unreadCount ?? 0) > 0 || (unreadMentionsCount ?? 0) > 0 ? (
    <>
      {(unreadMentionsCount ?? 0) > 0 && (
        <span className={classNames(showAsInternal ? "text-green-500" : "text-brand-orange-500")}>
          <Icons.Mention className="w-3 h-3" />
        </span>
      )}
      <UnreadCircle
        total={(unreadCount ?? 0) + (unreadMentionsCount ?? 0)}
        isDialog={isDialog}
        isInternal={showAsInternal}
      />
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

  const priority = React.useMemo(() => {
    const t = room?.tags?.find(t => t.name.startsWith(":priority"));

    if (t) {
      const [, , priorityType] = t.name.split(":");
      return (
        <span
          className={classNames(
            "bg-blue-50 text-gray-500 font-semibold px-1 rounded uppercase text-xs",
            "dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          {priorityType}
        </span>
      );
    }

    return null;
  }, [room?.tags]);

  return (
    <div
      className={classNames(
        "group w-full relative mb-1 pt-1 pb-3 pl-1 pr-2 border-l-5 rounded-r-md cursor-pointer hover:z-10 dark:bg-gray-800",
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
        {room.type === "private" && isExternal === true && isAgent && (
          <Icons.RoomExternal className="w-4 h-4 text-gray-500" />
        )}

        <span className="flex-1 flex flex-col fog:text-body-m truncate">
          <span
            className={classNames(showAsInternal && "text-green-500", "leading-snug truncate")}
            title={roomName}
          >
            {roomName}
          </span>
        </span>
        {!isAgent && priority && priority}
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

          {!latestMessageAuthor && (room.isTriage || isExternal) && (
            <span className="text-gray-500 dark:text-gray-400">☝️ Start here</span>
          )}

          {latestMessageAuthor && !latestMessageText && (
            <>
              <b className="fog:text-chat-username-s">{latestMessageAuthor}</b>:{" "}
              <span className="text-gray-500 dark:text-gray-400 italic">Uploaded a file</span>
            </>
          )}
        </span>
        <span className="text-gray-500 dark:text-gray-400 whitespace-no-wrap fog:text-body-s">
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

/**
 * Make sure that options are memoized to avoid unnecessary re-renders
 */
export type RosterViewOptions = {
  limit?: RosterOpenView["limit"];
  view: RosterOpenView["view"];
  sections?: RosterOpenView["sections"];
  filters?: RosterOpenView["filters"];
};
export const RosterViewSubscription = (props: { options: RosterViewOptions }) => {
  const { fogSessionId, workspaceId, helpdeskId, serverCall } = useWs();
  const { rosterSectionsActionsAtom } = useSharedRoster();
  const dispatchRosterSections = useUpdateAtom(rosterSectionsActionsAtom);

  const topic = fogSessionId
    ? workspaceId
      ? `workspace/${workspaceId}/roster`
      : helpdeskId
      ? `helpdesk/${helpdeskId}/roster`
      : undefined
    : undefined;

  const options = React.useMemo(() => {
    return {
      sections: [
        "ARCHIVED",
        "PINNED",
        "NEW VISITOR",
        "NEW",
        "ASSIGNED TO ME",
        "ASSIGNED",
        "DIRECT",
        "*OPEN",
      ],
      ...props.options,
    };
  }, [props.options]);

  const { status } = useQuery({
    queryKey: queryKeys.rosterViewSubscription(options),
    queryFn: async () => {
      invariant(topic !== undefined, "this should not be called if topic is undefined");
      const res = await serverCall<RosterOpenView>({
        msgType: "Roster.OpenView",
        topic,
        ...options,
      });
      invariant(res.msgType === "Roster.OpenViewOk", () => {
        console.error("Roster.OpenViewOk expected", res);
      });
      return res.items;
    },
    onSuccess: items => {
      dispatchRosterSections({ action: "reset_view", items });
    },
    enabled: !!topic,
    staleTime: Infinity,
    cacheTime: 0,
  });

  React.useEffect(() => {
    return () => {
      if (status === "success" && topic) {
        serverCall({
          msgType: "Roster.CloseView",
          topic,
          view: options.view,
        }).then(x => {
          if (x.msgType === "Roster.Err" && x.code === 404) {
            return;
          }
          invariant(x.msgType === "Roster.CloseViewOk", () => {
            console.error("Roster.CloseViewOk expected", x);
          });
        });
      }
    };
  }, [status, topic, serverCall, options]);

  return null;
};
