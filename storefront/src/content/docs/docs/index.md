---
title: Welcome to Fogbender docs
description: Welcome to Fogbender docs
tableOfContents: false
sidebar:
  hidden: true
---

[Fogbender](https://fogbender.com/signup) is a messaging platform specifically designed to facilitate communication between your company and a quickly-growing number of external (customer) _teams_.

Should you install the Fogbender team messaging widget in your customer-facing B2B web dashboard, your users will be able to communicate with your crew _and_ their colleagues in a shared environment. From your user's perspective, it's like a hybrid between Intercom and Slack Connect.

When to use Fogbender:

- You're adding new customers at a brisk pace
- You're anticipating many new customer signups soon
- You have more than one person doing support
- Your customers don't use Slack Connect

### Data model and terminology

"You" - person responsible for your company's customer support tooling - usually a founder, customer-facing engineer, or support/success leader.

You can join multiple Fogbender _organizations_ with the same account.

An organization has _agents_ and _workspaces_.

A workpace has _customers_.

A customer has _users_.

Agents are members of your company.

Users are members of your customers' companies.

See [Terminology](/docs/start-here/terminology) for details.

> **NOTE**: We assume your product can group users into shared accounts (meaning your users can invite their colleagues into a shared workspace within your product). Most B2B products either have, or will need this feature. If your B2B product doesn't have this feature and you'd like to add it, consider using Clerk - https://clerk.com/docs/organizations/overview - for user authentication with organization support.

### How it works

1. Embed the Fogbender team messaging widget (iFrame) in your authenticated user dashboard, by using one of our frontend libraries.

2. Instantiate the team messaging widget by constructing a token that identifies a user and the user's "customer" (account, group, organization - you may have to map the term your company uses to denote this grouping concept to our "customer"). If Fogbender encounters a customer it hasn't seen before, it will created it in your Fogbender workspace. Similarly, if it encounters a user it hasn't seen before, it'll create the user inside the customer.

3. When your user posts a message in the team messaging widget, all members of the user's shared account and all members of your Fogbender organization (the agents) will have an opportunity to respond.

At this point you've got your minimally-viable setup for in-app team-to-team support! From here, you can:

- Add an issue tracker integration, to connect customer conversations to issues in your developer-facing issue tracker
- Add a CRM integration
- Create agent shifts and default group assignments
- Connect existing Slack Connect channels to customers in Fogbender

# [Get started ➤](/docs/start-here/getting-started)
