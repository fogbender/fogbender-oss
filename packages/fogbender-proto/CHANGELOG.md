# fogbender-proto

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
