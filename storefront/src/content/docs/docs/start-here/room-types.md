---
title: Room types
description: Room types
sidebar:
  order: 3
---

### Customer public - triage

Customer triage rooms are the workhorses of team-to-team customer support - each customer automatically gets one of these rooms, and in the simplest scenarios, that's all you need for a humming - perhaps purring, even - happy, support crew.

In the example below, all agents belonging to your organization and all current and future users beloging to **Alice and Bob's LLM Repair** (customer) have access to the Triage room.

[![Room type - customer triage](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-customer-triage.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-customer-triage.png)

Note that if the word "Triage" is too clinical, too French, or both, you can change it in your workspace's **General** [settings](http://localhost:3100/admin/-/-/settings):

[![Workspace settings - general](https://fogbender-blog.s3.us-east-1.amazonaws.com/workspace-settings-general.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/workspace-settings-general.png)


### Customer public - issue

If a conversation merits its own discussion space and - optionally - an item in your developer-facing issue tracker, you can turn forward a contiguous sequence of messages to a new room. In the example below, this room is associated with a GitHub issue #7:

[![Room type - customer linked issue](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-customer-linked-issue.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-customer-linked-issue.png)

Like with triage rooms, all your agents and all current and future users belonging to a particular customer account (**Alice and Bob's LLM Repair**, in our example) have access to this room type.

### Customer private

If you need to converse with a subset of users from a customer/account in private regarding a sensitive matter, you can create a private room:

[![Room type - customer private](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-customer-private.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-customer-private.png)

Private rooms can be linked to a new or existing GitHub issue in room settings post-creation:

[![Private room linked to issue](https://fogbender-blog.s3.us-east-1.amazonaws.com/private-issue-remote-linking.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/private-issue-remote-linking.png)

### 1-1 with fellow team member

Selecting a fellow team member's name in roster search or clicking "Open 1-1" button on their user card yields an internal 1-1 (DM, direct message) room:

[![Open 1-1 button](https://fogbender-blog.s3.us-east-1.amazonaws.com/open-1-1-button.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/open-1-1-button.png)

The easiest way to tell a 1-1 room apart from other room types is the presence of the counterpart's user avatar in the room header:

[![Room type - 1-1 with fellow team member](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-1-1-internal.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-1-1-internal.png)

It goes without saying that 1-1 conversations belong to the organization, not the individuals.

### Agent 1-1 with customer/user

An agent can initiate a 1-1 with a customer user by search for the user's name in the roster or by clicking the "Open 1-1" button the user's user card.

[![Room type - Agent 1-1 with customer user](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-1-1-agent-with-user.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-1-1-agent-with-user.png)

A user _cannot_ initiate a 1-1 conversation with an agent, but once the 1-1 room has been created by an agent, it's available to the user:

[![Room type - 1-1 with customer user](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-1-1-customer-user.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-1-1-customer-user.png)

### User 1-1 with fellow user

Users from the same customer account are free to chat with each other in 1-1 rooms:

[![Room type - user-to-user 1-1](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-user-to-user-1-1.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-user-to-user-1-1.png)

### Internal conversations: public

Internal (green) rooms can be public - visible to all agents in an organization.

### Internal conversations: private

Internal (green) rooms can be private - visible to a subset of agents in an organization.

### Internal conversations: broadcast

A **Broadcast** room is a public room in Internal conversations with _Room type_ set to "Broadcast":

[![Room type - broadcast](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-broadcast.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-broadcast.png)

Messages in a Broadcast room can be forwarded to selected triage rooms:

[![Broadcasting messages](https://fogbender-blog.s3.us-east-1.amazonaws.com/broadcast-messages.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/broadcast-messages.png)

Once broadcast, these messages appear in all selected triage rooms with special pink treatment:

[![Broadcast messages in triage rooms](https://fogbender-blog.s3.us-east-1.amazonaws.com/broadcast-messages-in-triages.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/broadcast-messages-in-triages.png)

### Search

Search mode is not really a room type, more of a room _view_. Selecting a message matching a search term opens the room in question and highlights the message:

[![](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-search.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/room-type-search.png)

