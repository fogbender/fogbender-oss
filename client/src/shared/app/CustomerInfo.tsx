import { EventRoom, EventUser, Tag } from "fogbender-proto";

import { Agent } from "../types";

export type RenderCustomerInfoCb = (args: {
  ourId: string | undefined;
  helpdeskId: string;
  openRosterClick: (e: React.MouseEvent, room: EventRoom) => void;
  rooms: EventRoom[];
  roomsLoading: boolean;
  users: EventUser[];
  usersLoading: boolean;
  agents?: Agent[];
  activeRoomId?: string | undefined;
  setShowIssueInfo?: (tag: Tag) => void;
  vendorId: string;
}) => React.ReactNode;
