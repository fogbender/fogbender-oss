import classNames from "classnames";
import { useRosterActions } from "fogbender-proto";
import React from "react";

import { Icons } from "../components/Icons";
import { isInternalHelpdesk } from "../utils/format";
import { useClickOutside } from "../utils/useClickOutside";

import type { RoomHeaderProps } from "./RoomHeader";

export const RoomMenu: React.FC<Partial<RoomHeaderProps>> = ({
  room,
  roomId,
  ourId,
  workspaceId,
  paneId,
  isAgent,
  isActive,
  isLayoutPinned,
  isExpanded,
  singleRoomMode,
  onClose,
  onCloseOtherRooms,
  onOpenSearch,
  onSettings,
  onUnseen,
  onSetRoomPin,
  onGoFullScreen,
  mode,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const myPinTag = ourId ? `:@${ourId}:pin` : undefined;

  const { updateRoom } = useRosterActions({
    workspaceId,
  });

  const isRosterPinned = room?.tags?.some(t => t.name === myPinTag) || false;

  const onRosterPinRoom = () => {
    if (!room || !myPinTag) {
      return;
    }

    if (isRosterPinned) {
      updateRoom({ roomId: room.id, tagsToRemove: [myPinTag] });
    } else {
      updateRoom({ roomId: room.id, tagsToAdd: [myPinTag] });
    }
  };

  useClickOutside(menuRef, () => setExpanded(false), !expanded);

  return (
    <span
      className={classNames(
        "relative layout-nodrag sm:mr-2 cursor-pointer",
        !singleRoomMode && isActive
          ? "text-white hover:text-brand-red-500 dark:text-gray-400 dark:hover:text-brand-red-500"
          : "text-gray-500 hover:text-brand-red-500"
      )}
      onClick={() => setExpanded(x => !x)}
    >
      <Icons.Menu />
      <div
        ref={menuRef}
        className={classNames(
          "absolute z-20 top-full right-0 py-2 rounded-md fog:box-shadow-m bg-white text-black fog:text-body-m",
          "dark:bg-zinc-800 dark:text-white",
          expanded ? "block" : "hidden"
        )}
      >
        {onGoFullScreen && (
          <div
            onClick={onGoFullScreen}
            className={classNames(
              "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
              "dark:hover:bg-zinc-700"
            )}
          >
            <span>
              <Icons.FullScreen className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300" />
            </span>
            <span>Open in a new tab</span>
          </div>
        )}
        {isAgent && (
          <div
            onClick={onRosterPinRoom}
            className={classNames(
              "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
              "dark:hover:bg-zinc-700"
            )}
          >
            <span>
              <Icons.Pin
                className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300"
                solidColor={isRosterPinned ? "currentColor" : undefined}
                strokeWidth="1.5"
              />
            </span>
            <span>{isRosterPinned ? "Unpin" : "Pin"} (roster)</span>
          </div>
        )}

        <div
          onClick={() => onSetRoomPin?.(paneId, !isLayoutPinned)}
          className={classNames(
            "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
            "dark:hover:bg-zinc-700"
          )}
        >
          <span>
            <Icons.Pin
              className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300"
              solidColor={isLayoutPinned ? "currentColor" : undefined}
              strokeWidth="1.5"
            />
          </span>{" "}
          <span>{isLayoutPinned ? "Unpin (layout)" : "Pin (layout)"}</span>
        </div>
        {roomId && onOpenSearch && (
          <div
            onClick={() => onOpenSearch(roomId)}
            className={classNames(
              "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
              "dark:hover:bg-zinc-700"
            )}
          >
            <span>
              <Icons.Search
                strokeWidth="1.5"
                className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300"
              />
            </span>
            <span>Search room</span>
          </div>
        )}
        {room && room.type !== "dialog" && onSettings && (
          <div
            onClick={() => onSettings(room.id)}
            className={classNames(
              "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
              "dark:hover:bg-zinc-700"
            )}
          >
            <span>
              <Icons.GearNoFill className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300" />
            </span>
            <span>Room settings</span>
          </div>
        )}
        {room &&
          mode === "Room" &&
          (isInternalHelpdesk(room.customerName) || !isAgent) &&
          room.type === "public" && (
            <div
              onClick={() => {
                onUnseen?.();
                if (paneId) {
                  onClose?.(paneId);
                }
              }}
              className={classNames(
                "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
                "dark:hover:bg-zinc-700"
              )}
            >
              <span>
                <Icons.Leave
                  strokeWidth="1.5"
                  className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300"
                />
              </span>{" "}
              <span>Unfollow</span>
            </div>
          )}
        {paneId && !singleRoomMode && !isExpanded && (
          <div
            onClick={() => onCloseOtherRooms?.(paneId)}
            className={classNames(
              "flex group items-center gap-x-2 py-1.5 px-4 hover:bg-gray-100 cursor-pointer truncate",
              "dark:hover:bg-zinc-700"
            )}
          >
            <span>
              <Icons.FullScreen
                strokeWidth="1.5"
                className="w-6 text-gray-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300"
              />
            </span>{" "}
            <span>Expand</span>
          </div>
        )}
      </div>
    </span>
  );
};
