---
title: Agent roles
description: Learn about Fogbender agent roles
sidebar:
  order: 1
---

### Readers

Readers have read-only access to customer-facing conversations. The reader role serves three key purposes:

- Help you ensure only qualified personnel can communicate with customers
- Help you ensure customer support data is easily available to your entire team, regardless of function
- Help us establish a pricing policy where - roughly - the more successful you are, the more you pay for Fogbender (see [Pricing and billing](/docs/start-here/pricing) for details)

Note that readers have unlimited access to _Internal conversations_, convered in [the next section](/docs/start-here/internal-conversations).

### Agents

Agents can communicate with customers, but cannot perform any administrative tasks, such as sending invites, changing agent roles, or configuring integrations.

Note: Unfortunately, we've overloaded the term "agent" by having it refer to both a Fogbender vendor-end user (i.e. a "reader agent"), _and_ a role assignment - our bad.

### Admins

Admins can do _everything_ (invites, integrations, agent scheduling, AI setup, widget configuration, etc), with the exception of promoting teammates to owners, and marking a Fogbender organization as "deleted".

### Owners

Each Fogbender organization must have at least one owner. Currently, the only priviledges specific to owners are:

- Promoting other agents to owners
- Deleting the owner's organization

Note: at the moment, deleting an organization merely marks it as `deleted` and hides it from the list of organizations. If you'd like us to hard-delete your organization, please [ping us in support](/docs/start-here/support).

### Applications

Integrations appear as agents with role `Application` under Team:

[![app-agents](https://fogbender-blog.s3.amazonaws.com/app-agents.png)](https://fogbender-blog.s3.amazonaws.com/app-agents.png)

All applications have read and write access to customer-facing converstaions.
