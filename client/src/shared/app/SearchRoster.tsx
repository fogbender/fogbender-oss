import classNames from "classnames";
import {
  calculateCounterpart,
  EventBadge,
  EventRoom,
  invariant,
  SearchRoster,
  useWs,
} from "fogbender-proto";
import React from "react";
import { useQuery } from "react-query";

import { Icons } from "../components/Icons";
import { Avatar, UnreadCircle } from "../components/lib";
import { queryKeys } from "../utils/client";
import { formatCustomerName, isExternalHelpdesk, isInternalHelpdesk } from "../utils/format";
import { formatRosterTs } from "../utils/formatTs";

import { LayoutOptions } from "./LayoutOptions";

export const Roster: React.FC<{
  rooms: EventRoom[];
  openRoomIds: string[];
  activeRoomId: string | undefined;
  onRosterRoomClick: (room: EventRoom, opts: LayoutOptions) => void;
  onRoomSettingsClick: (id: string) => void;
  badges: { [key: string]: EventBadge };
  isAgent: boolean;
  searchString: string;
  searchForMessages: boolean;
  ourId?: string;
}> = ({
  rooms: roomsProp,
  openRoomIds,
  activeRoomId,
  onRosterRoomClick,
  onRoomSettingsClick,
  badges,
  isAgent,
  searchString,
  searchForMessages,
  ourId,
}) => {
  const countRef = React.useRef(0);
  const { serverCall, workspaceId, helpdeskId } = useWs();
  const terms = searchForMessages ? "message" : "rname,cname";
  const searchQuery = useQuery({
    queryKey: queryKeys.rosterSearchByString(workspaceId, helpdeskId, searchString, terms),
    queryFn: async ({ signal }) => {
      // debounce search requests
      await new Promise(r => setTimeout(r, 500));
      if (signal?.aborted) {
        throw new DOMException("new query was created", "AbortError");
      }
      // make sure that no more than one request is in flight at a time
      while (countRef.current) {
        await new Promise(r => setTimeout(r, 100));
        if (signal?.aborted) {
          throw new DOMException("new query was created", "AbortError");
        }
      }
      // count === 0 so this is the only search request in flight now
      const resPromise = serverCall<SearchRoster>({
        msgType: "Search.Roster",
        workspaceId,
        helpdeskId,
        term: searchString,
        termFields: terms.split(","),
      });
      // this magic ensures that the count is decremented even if the request has failed
      countRef.current += 1;
      resPromise.finally(() => {
        countRef.current -= 1;
      });
      const res = await resPromise;
      invariant(
        res.msgType === "Search.Ok",
        `Search.Roster response is not Search.Ok: ${res.msgType}`,
        () => console.error("Search failed", workspaceId, searchString, res)
      );
      return res.items;
    },
    staleTime: 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
  const rooms = searchQuery.data || roomsProp;

  return (
    <div className="flex h-1/2 flex-col relative">
      {searchQuery.isFetching && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-200 to-transparent h-2 rounded-xl mr-2" />
      )}
      <div className="flex-shrink fbr-scrollbar overflow-y-scroll">
        {rooms.length === 0 && (
          <p className="fog:text-caption-xl flex items-center justify-center px-1 py-2 text-center text-gray-400 !font-light">
            No matches
          </p>
        )}
        <div className="my-2">
          {rooms.map(room => (
            <RoomItem
              key={room.id}
              room={room}
              opened={openRoomIds.includes(room.id)}
              active={activeRoomId === room.id}
              onClick={onRosterRoomClick}
              onSettingsClick={onRoomSettingsClick}
              badge={badges[room.id]}
              isAgent={isAgent}
              ourId={ourId}
            />
          ))}
        </div>
      </div>
    </div>
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
          <Icons.Mention className="h-3 w-3" />
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
  badge?: EventBadge;
  isAgent: boolean | undefined;
  ourId?: string;
}> = ({ room, opened, active, onClick, onSettingsClick, badge, isAgent, ourId }) => {
  const counterpart = calculateCounterpart(room, ourId);
  const name = counterpart?.name || room.name;

  const unreadCount = badge?.count;
  const unreadMentionsCount = badge?.mentionsCount;
  const previewMessage = room.relevantMessage || badge?.lastRoomMessage;
  const showAsInternal = isInternalHelpdesk(room.customerName);
  const isExternal = isExternalHelpdesk(room.customerName);
  const isBug = room?.tags?.some(t => t.name === ":bug") || false;
  const isFeature = (room?.tags?.some(t => t.name === ":feature") && isBug !== true) || false;
  const isBroadcast = (showAsInternal && room?.tags?.some(t => t.name === ":triage")) || false;
  const isDiscussion = room?.tags?.some(t => t.name === ":discussion") || false;
  const resolved = room.resolved;

  return (
    <div
      className={classNames(
        "border-l-5 group relative mb-1 w-full cursor-pointer rounded-r-md pt-1 pb-3 pl-1 pr-2 hover:z-10",
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
        <div className="fog:text-caption-xl flex items-center space-x-1 truncate">
          <div className="flex flex-1 flex-col truncate">
            {formatCustomerName(room.customerName)}
          </div>
          {isAgent && !resolved && (
            <div>
              <div className="bg-brand-purple-500 h-2 w-2 rounded-full" />
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
        {room.type === "dialog" && <Avatar url={counterpart?.imageUrl} size={20} />}
        {room.type === "private" && isExternal === false && (
          <span className="fog:text-caption-xs rounded-xl bg-gray-800 py-0.5 px-1.5 text-white">
            Private
          </span>
        )}
        {room.type === "private" && isExternal === true && (
          <Icons.RoomExternal className="h-4 w-4 text-gray-500 hidden" />
        )}
        {room.isTriage ? (
          <Icons.RoomTriage className="h-4 w-4 text-gray-500 hidden" />
        ) : isBug ? (
          <Icons.RoomBug className="text-brand-red-500 h-4 w-4 hidden" />
        ) : isFeature ? (
          <Icons.RoomFeature className="text-brand-purple-500 h-4 w-4 hidden" />
        ) : isBroadcast ? (
          <Icons.Broadcast className="h-4 w-4 text-green-500" />
        ) : room.type === "public" && !showAsInternal && !isDiscussion ? (
          <Icons.RoomIssue className="h-4 w-4 text-gray-500 hidden" />
        ) : null}

        <span className="fog:text-body-m flex flex-1 flex-col truncate">
          <span
            className={classNames(showAsInternal && "text-green-500", "truncate leading-snug")}
            title={name}
          >
            {name}
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
          "fog:text-body-s mt-1.5 flex items-center space-x-1",
          isAgent && !room.relevantMessage && "hidden"
        )}
      >
        <span className="flex-1 truncate">
          {previewMessage && (
            <>
              <b className="fog:text-chat-username-s">{previewMessage.fromName?.split(/\s+/)[0]}</b>
              : {previewMessage.plainText}
            </>
          )}

          {!previewMessage && (room.isTriage || isExternal) && (
            <span className="text-gray-500">☝️ Start here</span>
          )}
        </span>
        <span className="whitespace-no-wrap fog:text-body-s text-gray-500">
          {formatRosterTs(previewMessage?.createdTs || room.createdTs)}
        </span>
      </div>
      {isAgent && (
        <div className="absolute right-0 bottom-0 -mb-1 mr-1 opacity-100 group-hover:opacity-100 sm:opacity-0">
          <span
            className="fog:box-shadow-s fog:text-body-s flex items-center rounded-full bg-white py-1 px-2 leading-none text-gray-500 hover:text-gray-800"
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
