# fogbender-proto

## 0.17.3

### Patch Changes

- 8bcaa72f: Update descriptions; add keywords

## 0.17.2

### Patch Changes

- ca5be34: Remove react-scripts dependency

## 0.17.1

### Patch Changes

- 3e1f15e: Update jotai

## 0.17.0

### Minor Changes

- e608311: support bot process.env and import.meta.env

### Patch Changes

- e608311: Switch fogbender-proto to tsup
- e608311: update to react-use-websocket@4 and use React's flushSync to set lastIncomingMessage

## 0.16.0

### Minor Changes

- c1c5dd3: Visitor (anon user) support

### Patch Changes

- bb6b077: add nosemgrep comment to ignore issue that should not be affecting production builds

## 0.15.0

### Minor Changes

- 5cdbc6c: breaking: remove badges from useRoster
- 6cbc50e: breaking: remove roomById from useRoster

### Patch Changes

- 651b3dc: add prompts field to Integration
- ec3dc3e: Stop recursing if no longer mounted
- ecc0992: breaking: change REACT*APP* env variable prefix to PUBLIC\_
- 5be2bb1: proto: special section types for customers and tags
- a361bb7: add AiSuggest command
- 730c59a: use focused roster
- a57ad54: fromName could be null if agent was deleted
- b8f8299: remove filteredRooms
- e4ec093: split useRoster into useRoster and useRosterActions
- 3d3f180: implement calculateStartPos that takes into account actual room position
- 3420bf1: add Event.AgentGroup
- 51b2dda: move lastIncomingMessage, sharedRoster into separate hook
- a242509: use userAvatarUrl from server if it has one
- c9f4608: add view to Event.RosterRoom
- 82c817e: Add Search.Roster.termFields to TS schema
- 582eeaf: Add termFields for global search
- 2d27dc4: sort roster sections in proto
- 99f530b: Add virtual 'commands' field to Room, return in EventRoom
- 9e9db42: Use/store schedule_id in PagerDuty integration
- f0f5746: add agent_group for pagerduty
- 35482ea: proto: add customerIds to Search.Customers
- ecec464: allow to only search public rooms in SearchRoster
- fdf6d50: Add NEW to default agent sections
- b2ee3d8: refactor: WsContext -> WsContextType
- d719098: Sort TAG sections above closed; add priority tag to user UI
- adac2c9: Don't show dialogs in customer info pane
- c7c655d: update setSeenRoster once instead of on each roster item
- aca571c: fix workspaceId? -> workspace_id?
- 1c19d61: Stop recursing if no longer mounted for users as well
- dd927b5: connect to roster sections from client (not just agents)
- 8bfd125: add relevantMessage field on Event.Room
- fea14e8: Make an explicit CLOSED section, similar to ASSIGNED
- 06ed332: add types for PagerDuty integration
- 7ca95e1: defaultGroupAssignment type
- b2ddf69: add CrmData to Customer type
- bdedc5d: improve error checking with invariant
- aa9f322: useRosterRoom hook to quickly access roster sections rooms by roomId
- 2e26fe5: do not use Roster.GetRooms to resolve badges #739
- cc0f18b: log the error during user auth for unknown errors
- bc62c6b: don't set badge state for each badge, do it once for the whole roster
- 5315549: chage updateRoster to save rooms in rosterSections as well
- 230fce6: Add IssueInfo command
- e75b118: do not use Roster.GetRooms to resolve unread rooms for favicon #739
- 8b361a0: add issueTitle to IntegrationForwardToIssue; add helpdeskId to EventUser
- 5764a9f: proto: use lastJsonMessage
- 11fda6f: sort closed issues lower
- 60eb110: add Author.Ok, Author.GetSettings, Author.UpdateSettings commands
- 8b11f0e: Fix phone_number type in CRM mapping
- 56b5fcb: let's not store isIdle in the context to avoid unnecessary re-renders
- 79a305d: improve RosterOpenView types
- b14e033: remove roster from useRoster
- 2f676a2: `useConnectRosterSections` hook is using jotai to access the roster sections instead of depending on the whole websocket contenxt. This is a performance improvement.
- 123cb46: Customer info pane: load 100 rooms at a time; show spinner while loading
- cb7ada6: Integration.ReopenIssue, Integration.CloseIssue
- b6efbc5: Add Ai.Summarize ws API call - returns up to 3 variants
- 0268a0e: add vendorId to Customer
- 0750d73: Get all users and rooms for the customer info pane
- 16d20b0: remove customers from useRoster

## 0.14.6

### Patch Changes

- ba3692d: Add ability to associate an existing room with a) new issue b) existing issues
- 0bf682f: Add shared_channel_helpdesk_associations to Integration type
- ab0e64f: proto: add thumbnailDataUrl in Attachment schema
- bb368cb: proto: Add support for Roster.GetRooms in schema
- c2e1d73: fogbender proto: add search customer type in schema and modify event customer type to support additional fields
- 28afb97: Return issueTag in Integration.Ok response to Integration.CreateIssue
- e916761: use AuthorType in MentionIn; fix EventMessage schema to add missing fields
- a9dc5d0: server can send badge that is null in a roster section element
- 272555c: improvements to roster sections (experimental api)
- f6ab857: update type of Integration
- 00e334f: remove unused roomByName, orderWeight
- acc9393: add isLoading to useIssues
- 8c808e1: proto: update to typescript 4.8.4
- 2eaa0d3: fix `lastIncomingMessage` (and a lot of things that depend on it) in React 18
- a358690: proto: show room creator
- c6e4871: `Message.Update` now supports updating `fileIds`
- 081d075: convert fromNameOverride from null to undefined
- bcb606a: add `fileExpirationTs` to `Attachment` to mark client when S3 url is going to expire
- 2ba7804: proto add Message.RefreshFiles RPC
- 86234c3: proto: improve types; remove implicit anys
- 8e31c5f: refactor: mark type imports
- 26103a0: useHelpdeskUsers - enables an agent to work with a roster limited to a single helpdesk
- bdade2c: specify exact integrations for integration type
- b2c84e5: use stricter but not strictest tsconfig
- 974b249: proto: add resolveRoom, unresolveRoom
- 638c969: proto: add useHelpdeskRooms
- a958576: proto: add resolved and resolvedCount
- 4506254: proto: add name to Event.Agent; add name, email, createdTs to users in Event.User
- 86fe242: oops, forgot to use useMemo here
- 031b392: Switch room resolver to Roster.GetRooms from Search.Room
- 37c4349: rename type File to Attachment so that it doesn't conflict with browser's global File type
- 5a5d31a: Unify 'author type' into actual type, add support for fromName and fromAvatarUrl overrides; use AuthorType in Reaction schema
- 992ceb4: proto: lastMessage lives on room intead of badge now
- 245e317: update types for react to 17 (it will not with 18 yet)
- 51c253a: start using Customer type from proto

## 0.14.5

### Patch Changes

- 8fdf54d: update npm install instructions in readme

## 0.14.4

### Patch Changes

- 6f9f9be: proto: add slack-customer as one of possible integration names

## 0.14.3

### Patch Changes

- eeca7a0: schema: add msteams and slack as possible integration types
- 412d4e7: pass current package version to server
- eeca7a0: add experimental useRosterSections hook to replace useRoster

## 0.14.2

### Patch Changes

- 522d3f7: added repository url to package.json so that npm will add this link

## 0.14.1

### Patch Changes

- 91b8c1b: preparing for ci release
