---
title: Getting started
description: Getting stareted
sidebar:
  order: 0
---

### Create account

To get started, create an account on https://fogbender.com/admin - you'll have to name your Fogbender organization (you can change it later).

You'll also have to create a workspace - we suggest using the name _Main_. Workspace names are not customer-facing (unlike organization names, which are), so you can choose a name that makes most sense for your setup (you can change workspace names later). For example, if you have a staging and a production environment, you could create a workspace for each environment, called _Staging_ and _Production_.

### Invite colleagues

You can use the Team page - https://fogbender.com/admin/-/team - to invite colleagues to your Fogbender organization. When creating an invite, you'll have to assign a role to the invitee - we'll cover different agent roles [in the next section](/docs/start-here/agent-roles).

### Auto-join configuration

At the bottom of the Team page you'll see the "Auto-join configuration" section: click "Allow" to permit others with email addresses that match your email domain to automatically join your organization as _Readers_.

![auto-join-config](https://fogbender-blog.s3.amazonaws.com/auto-join-configuration.png)

If your company uses multiple email domains, you can add domains in the same section. However, you'll have to prove domain ownership by setting a DNS TXT record.

![auto-join-dns-verification](https://fogbender-blog.s3.amazonaws.com/auto-join-dns-verification.png)
