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
  inbound: { msgId: string } & In;
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
  StreamSubRPC: RPC<
    StreamSub,
    | (Error<"Stream.Err"> & { topic: null | string })
    | StreamSubOk<EventRoom | EventMessage | EventTyping | EventSeen> // these returns are deprecated
  >;
  StreamUnSubRPC: RPC<StreamUnSub, StreamUnSubOk>;
  StreamGetRPC: RPC<
    StreamGet,
    StreamGetOk<
      EventCustomer | EventRoom | EventMessage | EventTyping | EventSeen | EventBadge | EventAgent
    >
  >;
  MessageCreateRPC: RPC<MessageCreate, MessageOk>;
  MessageUpdateRPC: RPC<MessageUpdate, MessageOk>;
  FileRPC: RPC<FileUpload, FileOk>;
  MessageSeenRPC: RPC<MessageSeen, MessageOk>;
  AuthUserRPC: RPC<AuthUser, AuthOk>;
  AuthAgentRPC: RPC<AuthAgent, AuthOk>;
  EchoRPC: RPC<EchoGet, EchoOk>;
  PingRPC: RPC<PingPing, PingPong>;
  TypingRPC: RPC<TypingSet, undefined>;
  SearchRosterRPC: RPC<SearchRoster, SearchOk>;
  EventMessageEVT: RPC<undefined, EventMessage>;
  EventTypingEVT: RPC<undefined, EventTyping>;
  EventRoomEVT: RPC<undefined, EventRoom>;
  EventSeenEVT: RPC<undefined, EventSeen>;
  EventNotificationMessageEVT: RPC<undefined, EventNotificationMessage>;
  EventBadgeEVT: RPC<undefined, EventBadge>;
  EventCustomerEVT: RPC<undefined, EventCustomer>;
};

export type Error<Type> = {
  code: number;
  error: string;
  msgId: string;
  msgType: Type;
};

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
  name: string;
  helpdeskId: string;
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
};

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

export type FileUpload = {
  msgId?: string;
  msgType: "File.Upload";
  roomId: string;
  fileName: string;
  fileType: string;
  binaryData: Buffer;
};

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
  messageId: string;
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
  term: string;
  type: "dialog";
};

export type SearchOk = {
  msgId: string;
  msgType: "Search.Ok";
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

export type AuthOk = {
  msgId: string;
  msgType: "Auth.Ok";
  sessionId: string;
  userId: string;
  helpdeskId: string;
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

// EVENTS

export type MessageLink = {
  sourceMessageId: string;
  targetMessageId: string;
  targetRoomId: string;
  linkType: "forward" | "reply";
  sourceFromId: string;
  sourceFromName: string;
  sourceInsertedTs: number;
};

export declare type File = {
  id: string;
  filename: string;
  contentType: string;
  fileBase64: string;
  thumbnail?: {
    url: string;
    height: number;
    width: number;
  };
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
  fromType: "User" | "Agent";
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

export type TypingUser = {
  id: string;
  name: string;
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

export type Customer = {
  id: string;
  name: string;
};

export type RoomStatus = "active" | "progress" | "closed" | "archived" | "removed";

export type EventRoom = {
  msgId?: string;
  msgType: "Event.Room";
  customerId: string;
  customerName: string;
  helpdeskId: string;
  id: string;
  name: string;
  status: RoomStatus;
  ts: number;
  vendorId: string;
  workspaceId: string;
};
