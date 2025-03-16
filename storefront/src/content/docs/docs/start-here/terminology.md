---
title: Terminology
description: Fogbender terminology
---

#### Organization

An _organization_ is the top-level entity in Fogbender: it contains agents and workspaces.

#### Agent

An _agent_ is a Fogbender user—if you can sign into https://fogbender.com/admin, you're an agent.

#### Owner

An _owner_ is an agent role with all priviledges.

#### Admin

An _admin_ is an agent role with all priviledges except deleting the organization and promoting agents to owners.

#### Agent (role)

An _agent_ is an agent (sorry) role without administrative priviledges, such as creating workspaces and configuring integrations.

#### Reader

A _reader_ is an agent role with read-only access to customer conversations, but full access to [Internal Conversations](/docs/start-here/internal-conversations).

#### Application

An _application_ is an agent role for non-human actors, such as GitHub, or Support Assistant.

#### Customer

A _customer_ is the rightmost _B_ in _B2B_—it's a company who is buying a or product or service from your company. A customer entity contains rooms and users.

#### User

A _user_ represents an individual who works at a customer company.

#### Visitor

A _visitor_ is either an anonymous (unknown email) user, or a user (known email) without a customer.

#### Visitor inbox

_Visitor inbox_ is a special customer which groups all visitors. Visitors cannot communicate with each other.

#### Workspace

A _workspace_ represents an environment (e.g., Production), product, or both. Workspaces house customers and integrations.

#### Integration

An integration connects Fogbender with external systems.

#### Room

A room is a named, persistent, searchable space for messages and files. A room always belongs to a customer, though some customers are special, like _Visitor inbox_ or _Internal Conversations_. Room names must be unique within a customer.

#### Triage

Whenever a new customer is created (upon the first login of a user from said customer) a _[Triage](/docs/start-here/room-types#triage-rooms)_ room is automatically created—it's a starting point for all support conversations.
