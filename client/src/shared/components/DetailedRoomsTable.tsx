import classNames from "classnames";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { calculateCounterpart, type EventRoom, type Tag } from "fogbender-proto";
import React from "react";

import { RoomAssignees } from "../app/RoomAssignees";
import { Icons } from "../components/Icons";
import { Avatar } from "../components/lib";
import { renderRoomTypeIcon } from "../components/RoomTypeIcon";
import { FontAwesomeLock } from "../font-awesome/Lock";
import { type Agent } from "../types";
import { formatCustomerName, isInternalHelpdesk, renderTag } from "../utils/format";

dayjs.extend(relativeTime);

export const DetailedRoomsTable: React.FC<{
  ourId: string | undefined;
  rooms: EventRoom[];
  agents: Agent[] | undefined;
  activeRoomId: string | undefined;
  openRosterClick: (e: React.MouseEvent, room: EventRoom) => void;
  onTagClick: (tag: Tag) => void;
  loading: boolean;
  showCustomerName?: boolean;
  showClosed?: boolean;
  vendorId: string;
}> = ({
  ourId,
  rooms,
  agents,
  activeRoomId,
  openRosterClick,
  onTagClick,
  loading,
  showCustomerName = false,
  showClosed = true,
  vendorId,
}) => {
  const issueTrackerTags = (room: EventRoom) =>
    (room.tags || []).filter(t => t.meta_type === "issue");

  if (loading) {
    return (
      <div className="p-2 w-full">
        <Icons.Spinner className="w-3 h-3 text-blue-500" />
      </div>
    );
  }

  return (
    <table className="text-xs mt-3 w-full">
      <tbody>
        {rooms
          .filter(r =>
            r.tags?.some(t => t.name.startsWith(":status:"))
              ? showClosed || r.tags.some(t => t.name === ":status:open")
              : true
          )
          .map(r => {
            const isInternal = isInternalHelpdesk(r.customerName);

            let typeIcon = renderRoomTypeIcon(r);

            const counterpart = calculateCounterpart(r, ourId);

            if (typeIcon === null) {
              if (r.type === "private") {
                typeIcon = <FontAwesomeLock className="text-gray-500 fa-fw self-center" />;
              } else if (r.type === "dialog" && counterpart) {
                typeIcon = (
                  <span className="pr-1.5">
                    <Avatar url={counterpart.imageUrl} name={counterpart.name} size={17} />
                  </span>
                );
              } else {
                typeIcon = <Icons.RoomIssue className="w-4 h-4 text-gray-500" />;
              }
            }

            return (
              <tr
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                key={r.id}
                onClick={e => {
                  if (r.id !== activeRoomId) {
                    openRosterClick(e, r);
                  }
                }}
              >
                <td
                  className={classNames(
                    "p-2",
                    activeRoomId === r.id
                      ? isInternal
                        ? "border-l-5 border-green-500"
                        : "border-l-5 border-brand-orange-500"
                      : "border-l-5 border-white dark:border-gray-800"
                  )}
                >
                  <div className="flex gap-2">
                    {/*
                  <div className="mt-1">{typeIcon}</div>
                  */}
                    <div className="w-full flex flex-col gap-0.5">
                      <span className="font-semibold break-all">
                        {counterpart?.name || r.name}
                        {!r.resolved && (
                          <div
                            title="Unresolved"
                            className="ml-1 w-2 h-2 rounded-full bg-brand-purple-500 inline-block align-middle"
                          />
                        )}
                      </span>
                      {counterpart?.email && (
                        <div className="break-all">
                          <a href={`mailto:${counterpart.email}`} className="fog:text-link">
                            {counterpart.email}
                          </a>
                        </div>
                      )}
                      {showCustomerName && (
                        <span>
                          {!isInternal && <span>Customer: </span>}
                          <span className="font-semibold">
                            {formatCustomerName(r.customerName)}
                          </span>
                        </span>
                      )}
                      <span>Created {dayjs(r.createdTs / 1000).fromNow()}</span>
                      {r.tags?.some(t => t.name.startsWith(":status:")) && (
                        <span>
                          Status:{" "}
                          {r.tags.some(t => t.name === ":status:open") && (
                            <span className="font-semibold">Open</span>
                          )}
                          {r.tags.some(t => t.name === ":status:closed") && (
                            <span className="font-semibold">Closed</span>
                          )}
                        </span>
                      )}
                      <div className="flex gap-1 items-center">
                        {r.type !== "dialog" && (
                          <RoomAssignees
                            readOnly={true}
                            ourId={ourId}
                            roomId={r.id}
                            roomTags={(r.tags || []).map(t => t.name)}
                            agents={agents}
                            vendorId={vendorId}
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 leading-none">
                        {issueTrackerTags(r).map(t => (
                          <div
                            key={t.id}
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              onTagClick(t);
                            }}
                          >
                            {renderTag(t)}
                          </div>
                        ))}
                      </div>
                      {r.status === "archived" && (
                        <div className="flex items-center">
                          <div className="font-semibold text-white bg-gray-400 px-1 py-px leading-none rounded">
                            archived
                          </div>
                        </div>
                      )}
                      {r.lastMessage?.createdTs && (
                        <div>
                          Last active:{" "}
                          {r.lastMessage?.createdTs &&
                            dayjs(r.lastMessage?.createdTs / 1000).fromNow()}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};
