---
"fogbender-proto": patch
---

`useConnectRosterSections` hook is using jotai to access the roster sections instead of depending on the whole websocket contenxt. This is a performance improvement.
