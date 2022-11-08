/* eslint-disable no-use-before-define */
// configuration types
export type UserToken = {
  widgetId: string;
  widgetKey?: string;
  customerId: string;
  customerName: string;
  userId: string;
  userHMAC?: string;
  userJWT?: string;
  userPaseto?: string;
  userName: string;
  userAvatarUrl?: string;
  userEmail: string;
  versions?: { [key: string]: string };
};

export type AgentToken = {
  agentId: string;
  vendorId: string;
  versions?: { [key: string]: string };
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
  ArchiveRoomRPC: RPC<RoomArchive, RoomOk>;
  UnarchiveRoomRPC: RPC<RoomUnarchive, RoomOk>;
  UpdateUserRPC: RPC<UserUpdate, UserOk>;
  IntegrationCreateIssueRPC: RPC<IntegrationCreateIssue, IntegrationOk>;
  IntegrationForwardToIssueRPC: RPC<IntegrationForwardToIssue, IntegrationOk>;
  StreamSubRPC: RPC<StreamSub, StreamError | StreamSubOk<EventStreamSubRPC>>;
  StreamUnSubRPC: RPC<StreamUnSub, StreamUnSubOk>;
  StreamGetRPC: RPC<StreamGet, StreamGetOk<EventStreamGetRPC>>;
  RosterSubRPC: RPC<RosterSub, RosterError | RosterSubOk<EventRoster>>;
  RosterUnSubRPC: RPC<RosterUnSub, RosterError | RosterUnSubOk>;
  RosterGetRPC: RPC<RosterGetRange, RosterError | RosterGetOk<EventRosterRoom>>;
  MessageCreateRPC: RPC<MessageCreate, MessageOk>;
  MessageCreateManyRPC: RPC<MessageCreateMany, MessageOk>;
  MessageUpdateRPC: RPC<MessageUpdate, MessageOk>;
  FileRPC: RPC<FileUpload, FileOk>;
  MessageSeenRPC: RPC<MessageSeen, MessageOk>;
  MessageUnseenRPC: RPC<MessageUnseen, MessageOk>;
  MessageSetReactionRPC: RPC<MessageSetReaction, MessageOk>;
  MessageRefreshFilesRPC: RPC<MessageRefreshFiles, MessageOk>;
  AuthUserRPC: RPC<AuthUser, AuthError | AuthOk>;
  AuthAgentRPC: RPC<AuthAgent, AuthError | AuthOk>;
  EchoRPC: RPC<EchoGet, EchoOk>;
  PingRPC: RPC<PingPing, PingPong>;
  TypingRPC: RPC<TypingSet, undefined>;
  SearchRosterRPC: RPC<SearchRoster, SearchOk<EventRoom>>;
  SearchMembersRPC: RPC<SearchMembers, SearchOk<EventRoom>>;
  SearchRoomRPC: RPC<SearchRoom, SearchOk<EventRoom>>;
  SearchRoomMessagesRPC: RPC<SearchRoomMessages, SearchOk<EventMessage>>;
  SearchIssuesRPC: RPC<SearchIssues, SearchOk<EventIssue>>;
  SearchAuthorEmailRPC: RPC<SearchAuthorEmail, SearchOk<EventAuthorEmail>>;
  TagCreate: RPC<TagCreate, TagOk>;
  TagUpdate: RPC<TagUpdate, TagOk>;
  TagDelete: RPC<TagDelete, TagOk>;
  RoomResolve: RPC<RoomResolve, RoomOk>;
  RoomUnresolve: RPC<RoomUnresolve, RoomOk>;
  EventMessageEVT: RPC<undefined, EventMessage>;
  EventTypingEVT: RPC<undefined, EventTyping>;
  EventRoomEVT: RPC<undefined, EventRoom>;
  EventSeenEVT: RPC<undefined, EventSeen>;
  EventNotificationMessageEVT: RPC<undefined, EventNotificationMessage>;
  EventBadgeEVT: RPC<undefined, EventBadge>;
  EventCustomerEVT: RPC<undefined, EventCustomer>;
  EventTagEVT: RPC<undefined, EventTag>;
  EventUserEVT: RPC<undefined, EventUser>;
  EventRosterSectionEVT: RPC<undefined, EventRosterSection>;
  EventRosterRoomEVT: RPC<undefined, EventRosterRoom>;
};

export type EventStreamSubRPC = EventRoom | EventMessage | EventTyping | EventSeen;

export type EventStreamGetRPC =
  | EventCustomer
  | EventRoom
  | EventMessage
  | EventTyping
  | EventSeen
  | EventBadge
  | EventAgent
  | EventTag
  | EventUser;

export type EventRoster = EventRosterRoom | EventRosterSection;

export type Error<Type> = {
  code: number;
  error: string;
  msgId: string;
  msgType: Type;
  data?: { [key: string]: string[] };
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

export type RoomArchive = {
  msgId?: string;
  msgType: "Room.Archive";
  roomId: string;
};

export type RoomUnarchive = {
  msgId?: string;
  msgType: "Room.Unarchive";
  roomId: string;
};

export type RoomOk = {
  msgId: string;
  msgType: "Room.Ok";
  roomId: string;
};

export type UserUpdate = {
  msgId?: string;
  msgType: "User.Update";
  userId: string;
  imageUrl: string | null;
};

export type UserOk = {
  msgId: string;
  msgType: "User.Ok";
  userId: string;
};

export type Integration = {
  id: string;
  workspace_id: string;
  type: string;
  userInfo?: {
    email: string;
    pictureUrl: string;
    username: string;
  };
  base_url: string;
  project_url: string;
  project_id: string;
  project_name: string;
  project_path: string;
  repository_name: string;
  inserted_at: string;
  meta_tag: string;
  webhook_id?: string;
};

export type IntegrationCreateIssue = {
  msgId?: string;
  msgType: "Integration.CreateIssue";
  workspaceId: string;
  integrationProjectId: string;
  title: string;
  linkRoomId: string;
  linkStartMessageId: string;
  linkEndMessageId: string;
};

export type IntegrationForwardToIssue = {
  msgId?: string;
  msgType: "Integration.ForwardToIssue";
  workspaceId: string;
  integrationProjectId: string;
  issueId: string;
  linkRoomId: string;
  linkStartMessageId: string;
  linkEndMessageId: string;
};

export type IntegrationOk = {
  msgId: string;
  msgType: "Integration.Ok";
  issueId?: string;
  issueTag?: string;
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
  prev?: string;
  next?: string;
};

export type StreamGetOk<Item> = {
  msgId: string;
  msgType: "Stream.GetOk";
  topic: string;
  items: Item[];
  prev?: string | null;
  next?: string | null;
};

export type RosterSub = {
  msgId?: string;
  msgType: "Roster.Sub";
  topic: string;
  limit: number;
};

export type RosterSubOk<Item> = {
  msgId: string;
  msgType: "Roster.SubOk";
  topic: string;
  items: Item[];
};

export type RosterError = Error<"Roster.Err"> & { topic: null | string };

export type RosterUnSub = {
  msgId?: string;
  msgType: "Roster.UnSub";
  topic: string;
};

export type RosterUnSubOk = {
  msgId: string;
  msgType: "Roster.UnSubOk";
  topic: string;
};

export type RosterGetRange = {
  msgId?: string;
  msgType: "Roster.GetRange";
  topic: string;
  sectionId: string;
  startPos: number;
  limit: number;
};

export type RosterGetOk<Item> = {
  msgId: string;
  msgType: "Roster.GetOk";
  topic: string;
  items: Item[];
};

export type Mention = {
  msgType: "Message.Mention";
  id: string;
  text: string;
};

export type MentionIn = {
  id: string;
  name: string;
  text: string;
  type: "Agent" | "User";
};

export type Reaction = {
  fromid: string;
  fromName: string;
  fromType: "User" | "Agent";
  updatedTs: number;
  reaction: string;
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
  mentions?: Mention[];
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
  fileIds?: string[];
  mentions?: Mention[];
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

export type MessageUnseen = {
  msgId?: string;
  msgType: "Message.Unseen";
  roomId: string;
};

export type MessageSetReaction = {
  msgId?: string;
  msgType: "Message.SetReaction";
  messageId: string;
  reaction: string | null;
};

export type MessageRefreshFiles = {
  msgId?: string;
  msgType: "Message.RefreshFiles";
  messageId: string;
};

export type MessageOk = {
  msgId: string;
  msgType: "Message.Ok";
  messageId?: string;
  messageIds?: string[];
  items?: EventMessage[];
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
  mentionRoomId?: string;
  type?: "dialog";
  term?: string;
  tagIds?: string[];
  tagNames?: string[];
};

export type SearchMembers = {
  msgId?: string;
  msgType: "Search.Members";
  workspaceId?: string;
  helpdeskId?: string;
  roomId: string;
};

export type SearchIssues = {
  msgId?: string;
  msgType: "Search.Issues";
  workspaceId: string;
  term: string;
};

export type SearchOk<Item> = {
  msgId: string;
  msgType: "Search.Ok";
  items: Item[];
};

export type SearchAuthorEmail = {
  msgId?: string;
  msgType: "Search.AuthorEmail";
  workspaceId: string;
  type: "agent" | "user";
  authorId: string;
};

export type SearchRoom = {
  msgId?: string;
  msgType: "Search.Room";
  roomId: string;
};

export type SearchRoomMessages = {
  msgId?: string;
  msgType: "Search.RoomMessages";
  roomId: string;
  term: string;
  limit?: number;
};

export type TagOk = {
  msgId: string;
  msgType: "Tag.Ok";
};

export type TagCreate = {
  msgId?: string;
  msgType: "Tag.Create";
  workspaceId: string;
  tag: string;
};

export type TagUpdate = {
  msgId?: string;
  msgType: "Tag.Update";
  workspaceId: string;
  tag: string;
  newTag: string;
};

export type TagDelete = {
  msgId?: string;
  msgType: "Tag.Delete";
  workspaceId: string;
  tag: string;
};

export type RoomResolve = {
  msgId?: string;
  msgType: "Room.Resolve";
  roomId: string;
  tilTs?: number | null;
};

export type RoomUnresolve = {
  msgId?: string;
  msgType: "Room.Unresolve";
  roomId: string;
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
  userAvatarUrl?: string;
  avatarLibraryUrl?: string;
  role?: string;
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
  lastActivityTs?: number;
};

export type PingPong = {
  msgId: string;
  msgType: "Ping.Pong";
};

// BEGIN events

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
  rawText: string;
  plainText?: string;
  mentions?: MentionIn[];
  reactions?: Reaction[];
  files: Attachment[];
  updatedTs: number;
  createdTs: number;
  linkRoomId?: string;
  linkStartMessageId?: string;
  linkEndMessageId?: string;
  linkType?: "forward" | "reply";
  targets?: EventMessage[];
  sources?: EventMessage[];
  deletedTs?: number;
  deletedByName?: string;
  editedTs?: number;
  editedByName?: string;
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
  plainText: string;
};

export type EventBadge = {
  msgId?: string;
  msgType: "Event.Badge";
  roomId: string;
  roomType: string;
  count: number;
  mentionsCount: number;
  vendorId: string;
  workspaceId: string;
  customerId: string;
  firstUnreadMessage?: EventMessage | null;
  lastRoomMessage?: EventMessage | null;
  nextMentionMessage?: EventMessage | null;
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
  name: string;
  role: "owner" | "admin" | "agent" | "reader" | "app";
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
  customerDeletedTs?: string;
  helpdeskId: string;
  id: string;
  name: string;
  isTriage?: boolean;
  imageUrl: string; // search template
  email: string; // search template
  agentId: string | null; // search template
  userId: string | null; // search template
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
  resolved: boolean;
  resolvedAt: number | null;
  resolvedByAgentId: string | null;
  resolvedTil: number | null;
  lastMessage: EventMessage | null;
};

export type IssueLabel = {
  id: string;
  title: string;
};

export type EventIssue = {
  msgId?: string;
  msgType: "Event.Issue";
  type: KnownIssueTrackerIntegration;
  title: string;
  integrationId: string;
  id: string;
  number: string;
  url: string;
  issueId: string;
  state: string;
  meta_tag: string;
  labels?: IssueLabel[];
};

export type EventAuthorEmail = {
  email: string;
};

export type RosterSectionId =
  | "ARCHIVED"
  | "PINNED"
  | "ASSIGNED TO ME"
  | "ASSIGNED"
  | "DIRECT"
  | "OPEN"
  | "PRIVATE"
  | "INBOX";

export type EventRosterSection = {
  msgId?: string;
  msgType: "Event.RosterSection";
  name: string;
  id: RosterSectionId;
  pos: number;
  unresolvedCount: number;
  unreadCount: number;
  mentionsCount: number;
  count: number;
};

// Record<id, pos>
export type EventRosterSectionPosition = Record<RosterSectionId, number>;

export type EventRosterRoom = {
  msgId?: string;
  msgType: "Event.RosterRoom";
  room: EventRoom;
  badge: EventBadge;
  sections: EventRosterSectionPosition;
};

// END events

// BEGIN nested types
export type RoomStatus = "active" | "progress" | "closed" | "archived" | "removed";

export type TypingUser = {
  id: string;
  name: string;
};

export declare type Attachment = {
  id: string;
  filename: string;
  contentType: string;
  type?: "attachment:image" | "attachment:other";
  thumbnail?: {
    url: string;
    height: number;
    thumbnailDataUrl?: string;
    width: number;
    original_width: number;
    original_height: number;
  };
  fileExpirationTs: number;
  fileUrl: string;
  downloadUrl: string;
  fileSize: number;
};

export type Customer = {
  id: string;
  name: string;
  deletedTs?: string;
};

export type EventTag = {
  msgId?: string;
  msgType: "Event.Tag";
  id: string;
  name: string;
  remove?: boolean;
};

export type EventUser = {
  msgId?: string;
  msgType: "Event.User";
  userId: string;
  imageUrl: string;
  name: string;
  email: string;
  createdTs: number;
};

export type RoomMember = {
  id: string;
  type: "agent" | "user";
  imageUrl: string;
  name: string;
  email: string;
};

export const MetaTypes = ["issue_tracker", "issue", "status"];
export type MetaType = typeof MetaTypes[number];

export const KnownIssueTrackerIntegrations = [
  "gitlab",
  "github",
  "asana",
  "jira",
  "linear",
  "height",
  "trello",
];
export type KnownIssueTrackerIntegration = typeof KnownIssueTrackerIntegrations[number];

export const KnownCommsIntegrations = ["slack", "msteams", "slack-customer"];
export type KnownCommsIntegration = typeof KnownCommsIntegrations[number];

export type Tag = {
  id: string;
  name: string;
  workspaceId?: string;
  title?: string;
  meta_type?: MetaType;
  meta_entity_type?: KnownIssueTrackerIntegration | KnownCommsIntegration;
  meta_entity_url?: string;
  meta_entity_name?: string;
  meta_entity_id?: string;
};

export type Helpdesk = {
  id: string;
  tags: Tag[];
  vendorName: string;
};
// END nested types
