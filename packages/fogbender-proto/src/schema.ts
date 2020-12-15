/* eslint-disable no-use-before-define */
// configuration types
export type UserToken = {
  widgetId: string;
  customerId: string;
  customerName: string;
  userId: string;
  userHMAC?: string;
  userJWT?: string;
  userPaseto?: string;
  userName: string;
  userAvatarUrl?: string;
  userEmail?: string;
};

export type AgentToken = {
  agentId: string;
  vendorId: string;
};

export type AnyToken = UserToken | AgentToken;

// UTILITY TYPES

// We establish direction from the perspective of the client:
//   Out: from client to server
//   In: from server to client
export type RPC<Out, In> = {
  orig: Out;
  outbound: { msgId: string } & Out;
  inbound: FatalError | ({ msgId: string } & In);
};

export type FogSchema = APISchema[keyof APISchema];
export type ServerEvents = Extract<FogSchema, RPC<undefined, any>>;
export type ServerCalls = Exclude<FogSchema, RPC<undefined, any>>;

// SERVER TYPES

export type APISchema = {
  RoomCloseRPC: RPC<RoomClose, RoomOk>;
  RoomReOpenRPC: RPC<RoomReOpen, RoomOk>;
  RoomInProgressRPC: RPC<RoomInProgress, RoomOk>;
  CreateRoomRPC: RPC<RoomCreate, RoomOk>;
  UpdateRoomRPC: RPC<RoomUpdate, RoomOk>;
  StreamSubRPC: RPC<
    StreamSub,
    StreamError | StreamSubOk<EventRoom | EventMessage | EventTyping | EventSeen> // these returns are deprecated
  >;
  StreamUnSubRPC: RPC<StreamUnSub, StreamUnSubOk>;
  StreamGetRPC: RPC<
    StreamGet,
    StreamGetOk<
      | EventCustomer
      | EventRoom
      | EventMessage
      | EventTyping
      | EventSeen
      | EventBadge
      | EventAgent
      | EventTag
    >
  >;
  MessageCreateRPC: RPC<MessageCreate, MessageOk>;
  MessageCreateManyRPC: RPC<MessageCreateMany, MessageOk>;
  MessageUpdateRPC: RPC<MessageUpdate, MessageOk>;
  FileRPC: RPC<FileUpload, FileOk>;
  MessageSeenRPC: RPC<MessageSeen, MessageOk>;
  AuthUserRPC: RPC<AuthUser, AuthError | AuthOk>;
  AuthAgentRPC: RPC<AuthAgent, AuthError | AuthOk>;
  EchoRPC: RPC<EchoGet, EchoOk>;
  PingRPC: RPC<PingPing, PingPong>;
  TypingRPC: RPC<TypingSet, undefined>;
  SearchRosterRPC: RPC<SearchRoster, SearchOk<EventRoom>>;
  SearchMembersRPC: RPC<SearchMembers, SearchOk<EventRoom>>;
  EventMessageEVT: RPC<undefined, EventMessage>;
  EventTypingEVT: RPC<undefined, EventTyping>;
  EventRoomEVT: RPC<undefined, EventRoom>;
  EventSeenEVT: RPC<undefined, EventSeen>;
  EventNotificationMessageEVT: RPC<undefined, EventNotificationMessage>;
  EventBadgeEVT: RPC<undefined, EventBadge>;
  EventCustomerEVT: RPC<undefined, EventCustomer>;
  EventTagEVT: RPC<undefined, EventTag>;
};

export type Error<Type> = {
  code: number;
  error: string;
  msgId: string;
  msgType: Type;
};

export type FatalError = Error<"Error.Fatal">;

export type RoomClose = {
  msgId?: string;
  msgType: "Room.Close";
  roomId: string;
};

export type RoomReOpen = {
  msgId?: string;
  msgType: "Room.ReOpen";
  roomId: string;
};

export type RoomInProgress = {
  msgId?: string;
  msgType: "Room.InProgress";
  roomId: string;
};

export type RoomCreate = {
  msgId?: string;
  msgType: "Room.Create";
  helpdeskId: string;
  name?: string;
  members?: string[];
  type?: "public" | "private" | "dialog";
  tags?: string[]; // tag ids; see workspace.tags
  meta?: string[]; // service-level tag names
  // create and forward
  linkRoomId?: string;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
};

export type RoomUpdate = {
  msgId?: string;
  msgType: "Room.Update";
  roomId: string;
  name?: string;
  membersToAdd?: string[];
  membersToRemove?: string[];
  tagsToAdd?: string[];
  tagsToRemove?: string[];
};

export type RoomOk = {
  msgId: string;
  msgType: "Room.Ok";
  roomId: string;
};

export type StreamSub = {
  msgId?: string;
  msgType: "Stream.Sub";
  topic: string;
  before?: number;
  around?: number;
  since?: number;
  limit?: number;
  aroundId?: string;
};

export type StreamSubOk<Item> = {
  msgId: string;
  msgType: "Stream.SubOk";
  topic: string;
  items: Item[];
  tooManyUpdates?: boolean;
};

export type StreamError = Error<"Stream.Err"> & { topic: null | string };

export type StreamUnSub = {
  msgId?: string;
  msgType: "Stream.UnSub";
  topic: string;
};

export type StreamUnSubOk = {
  msgId: string;
  msgType: "Stream.UnSubOk";
  topic: string;
};

export type StreamGet = {
  msgId?: string;
  msgType: "Stream.Get";
  topic: string;
  before?: number;
  around?: number;
  since?: number;
  startId?: string;
  endId?: string;
  limit?: number;
  aroundId?: string;
  onlyForwards?: boolean;
};

export type StreamGetOk<Item> = {
  msgId: string;
  msgType: "Stream.GetOk";
  topic: string;
  items: Item[];
};

export type MessageCreate = {
  msgId?: string;
  msgType: "Message.Create";
  clientId: string;
  roomId: string;
  text: string;
  fileIds?: string[];
  linkRoomId?: string;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
  linkType?: "forward" | "reply";
};

export type MessageCreateMany = {
  msgId?: string;
  msgType: "Message.CreateMany";
  clientId: string;
  messages: MessageCreate[];
};

export type FileUpload = {
  msgId?: string;
  msgType: "File.Upload";
  roomId: string;
  fileName: string;
  fileType: string;
} & ({ binaryData: Buffer } | { base64Data: string });

export type FileOk = {
  msgId: string;
  msgType: "File.Ok";
  fileId: string;
};

export type MessageUpdate = {
  msgId?: string;
  msgType: "Message.Update";
  messageId: string;
  text?: string;
  linkRoomId?: string | null;
  linkStartMessageId?: string | null;
  linkEndMessageId?: string | null;
  linkType?: "forward" | "reply" | null;
};

export type MessageSeen = {
  msgId?: string;
  msgType: "Message.Seen";
  roomId: string;
  messageId?: string;
};

export type MessageOk = {
  msgId: string;
  msgType: "Message.Ok";
  messageId?: string;
  messageIds?: string[];
};

export type TypingSet = {
  msgId?: string;
  msgType: "Typing.Set";
  roomId: string;
};

export type SearchRoster = {
  msgId?: string;
  msgType: "Search.Roster";
  workspaceId?: string;
  helpdeskId?: string;
  type?: "dialog";
  term?: string;
  tag_ids?: string[];
  meta?: string[];
};

export type SearchMembers = {
  msgId?: string;
  msgType: "Search.Members";
  workspaceId?: string;
  helpdeskId?: string;
  roomId: string;
};

export type SearchOk<Item> = {
  msgId: string;
  msgType: "Search.Ok";
  items: Item[];
};

export type AuthUser = {
  msgId?: string;
  msgType: "Auth.User";
} & UserToken;

export type AuthAgent = {
  msgId?: string;
  msgType: "Auth.Agent";
  token: string;
} & AgentToken;

export type AuthError = Error<"Auth.Err">;

export type AuthOk = {
  msgId: string;
  msgType: "Auth.Ok";
  sessionId: string;
  userId: string;
  helpdeskId: string;
  helpdesk?: Helpdesk;
};

export type EchoGet = {
  msgId?: string;
  msgType: "Echo.Get";
  message: string;
};

export type EchoOk = {
  msgId: string;
  msgType: "Echo.Ok";
  message: string;
};

export type PingPing = {
  msgId?: string;
  msgType: "Ping.Ping";
};

export type PingPong = {
  msgId: string;
  msgType: "Ping.Pong";
};

// BEGIN events

export type MessageLink = {
  sourceMessageId: string;
  targetMessageId: string;
  targetRoomId: string;
  linkType: "forward" | "reply";
  targetFromId: string;
  targetFromName: string;
  targetInsertedTs: number;
};

export type EventMessage = {
  msgId?: string;
  msgType: "Event.Message";
  clientId: string;
  vendorId: string;
  workspaceId: string;
  helpdeskId: string;
  customerId: string;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string;
  fromType: "user" | "agent";
  roomId: string;
  id: string;
  text: string;
  files: File[];
  updatedTs: number;
  createdTs: number;
  links?: MessageLink[];
  linkRoomId?: string;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
  linkType?: "forward" | "reply";
  deletedTs?: number;
  deletedByName?: string;
};

export type EventNotificationMessage = {
  msgId?: string;
  msgType: "Event.Notification.Message";
  clientId: string;
  vendorId: string;
  workspaceId: string;
  helpdeskId: string;
  customerId: string;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string;
  fromType: "User" | "Agent";
  roomId: string;
  id: string;
  text: string;
  updatedTs: number;
  createdTs: number;
};

export type EventBadge = {
  msgId?: string;
  msgType: "Event.Badge";
  roomId: string;
  count: number;
  firstUnreadMessageId: string;
  lastUnreadMessageId: string;
  firstUnreadMessageText: string;
  lastUnreadMessageText: string;
  firstUnreadMessageFromId: string;
  lastUnreadMessageFromId: string;
  firstUnreadMessageFromType: string;
  lastUnreadMessageFromType: string;
  firstUnreadMessageFromName: string;
  lastUnreadMessageFromName: string;
};

export type EventCustomer = {
  msgId?: string;
  msgType: "Event.Customer";
  id: string;
  externalUid: string;
  vendorId: string;
  helpdeskId: string;
  workspaceId: string;
  name: string;
  updatedTs: number;
  createdTs: number;
};

export type EventAgent = {
  msgId?: string;
  msgType: "Event.Agent";
  id: string;
  email: string;
  role: "owner" | "admin" | "agent";
  imageUrl: string;
  createdTs: number;
  updatedTs: number;
  deletedTs: number;
  deletedById: string;
  updatedById: string;
};

export type EventTyping = {
  msgId?: string;
  msgType: "Event.Typing";
  roomId: string;
  data: TypingUser[];
};

export type EventSeen = {
  msgId?: string;
  msgType: "Event.Seen";
  roomId: string;
  messageId?: string;
};

// deprecated
export type EventRoom = {
  msgId?: string;
  msgType: "Event.Room";
  customerId: string;
  customerName: string;
  helpdeskId: string;
  id: string;
  name: string;
  imageUrl: string; // search template
  email: string; // search template
  agentId: string; // search template
  userId: string; // search template
  createdTs: number;
  updatedTs: number;
  vendorId: string;
  workspaceId: string;
  created: boolean;
  type: "dialog" | "public" | "private";
  members?: RoomMember[];
  tags?: Tag[];
  status: RoomStatus; // deprecated
  remove?: boolean;
};

// END events

// BEGIN nested types
export type RoomStatus = "active" | "progress" | "closed" | "archived" | "removed";

export type TypingUser = {
  id: string;
  name: string;
};

export declare type File = {
  id: string;
  filename: string;
  contentType: string;
  thumbnail?: {
    url: string;
    height: number;
    width: number;
  };
} & (
  | {
      fileBase64: string;
    }
  | {
      fileUrl: string;
    }
);

export type Customer = {
  id: string;
  name: string;
};

export type EventTag = {
  msgId?: string;
  msgType: "Event.Tag";
  id: string;
  name: string;
  remove?: boolean;
};

export type RoomMember = {
  id: string;
  type: "agent" | "user";
  imageUrl: string;
  name: string;
  email: string;
};

export type Tag = {
  id: string;
  name: string;
  workspaceId?: string;
};

export type Helpdesk = {
  id: string;
  tags: Tag[];
};
// END nested types
