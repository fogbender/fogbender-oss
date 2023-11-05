import { type EventRoom } from "fogbender-proto";

import { isInternalHelpdesk } from "../utils/format";

import { Icons } from "./Icons";

export const renderRoomTypeIcon = (room: EventRoom) => {
  const isBug = room?.tags?.some(t => t.name === ":bug") || false;
  const isFeature = (room?.tags?.some(t => t.name === ":feature") && isBug !== true) || false;
  const isBroadcast =
    (isInternalHelpdesk(room?.customerName) && room?.tags?.some(t => t.name === ":triage")) ||
    false;
  const isDiscussion = room?.tags?.some(t => t.name === ":discussion") || false;
  const showAsInternal = isInternalHelpdesk(room.customerName);

  return room.isTriage ? (
    <Icons.RoomTriage className="w-4 h-4 text-gray-500" />
  ) : isBug ? (
    <Icons.RoomBug className="w-4 h-4 text-brand-red-500" />
  ) : isFeature ? (
    <Icons.RoomFeature className="w-4 h-4 text-gray-500" />
  ) : isBroadcast ? (
    <Icons.Broadcast className="w-4 h-4 text-green-500" />
  ) : room.type === "public" && !showAsInternal && !isDiscussion ? (
    <Icons.RoomIssue className="w-4 h-4 text-gray-500" />
  ) : null;
};
