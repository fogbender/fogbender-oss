import classNames from "classnames";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { type EventRoom, type Tag, useHelpdeskRooms, useHelpdeskUsers } from "fogbender-proto";
import React from "react";

import type { Agent } from "../types";

import { type RenderCustomerInfoCb } from "./CustomerInfo";
import { type LayoutOptions } from "./LayoutOptions";

dayjs.extend(relativeTime);

export const CustomerInfoPane: React.FC<{
  ourId: string | undefined;
  helpdeskId: string | undefined;
  vendorId: string;
  activeRoomId: string | undefined;
  openRoom: (room: EventRoom, opts: LayoutOptions) => void;
  agents?: Agent[];
  showIssueInfo?: Tag | undefined;
  setShowIssueInfo?: (tag: Tag) => void;
  renderCustomerInfoPane?: RenderCustomerInfoCb;
}> = ({
  ourId,
  helpdeskId,
  vendorId,
  activeRoomId,
  openRoom,
  agents,
  setShowIssueInfo,
  renderCustomerInfoPane,
}) => {
  const { rooms, loading: roomsLoading } = useHelpdeskRooms({ helpdeskId });
  const { users, loading: usersLoading } = useHelpdeskUsers({ helpdeskId });

  return (
    <div
      className={classNames(
        "relative flex h-full flex-col justify-end overflow-hidden bg-white focus:outline-none",
        "sm:border-l sm:px-2"
      )}
    >
      <div
        className={classNames(
          "fbr-scrollbar flex flex-1 flex-col justify-start gap-2 overflow-auto overflow-x-hidden text-black"
        )}
      >
        {helpdeskId &&
          renderCustomerInfoPane?.({
            ourId,
            helpdeskId,
            openRosterClick: (e, r) => openRoom(r, { forceFullscreen: e.metaKey || e.ctrlKey }),
            activeRoomId,
            rooms,
            roomsLoading,
            users,
            usersLoading,
            agents,
            setShowIssueInfo,
            vendorId,
          })}
      </div>
    </div>
  );
};
