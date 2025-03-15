---
title: User types
description: Learn about the user types in Fogbender
sidebar:
  order: 4
---

We'll cover the mechanics of instantiating widgets for specific user types in the [Widget configuration](/docs/widget-configuration/overview) section.

Meanwhile, let's take a look at the different user types.


### User

If a person can sign into your application and you know this person's `id` and email address, it's a _user_. Optionally, a user may also have a name and an avatar URL. Users authenticate with Fogbender by piggy-backing onto your native authentication. The identity of users within a Fogbender widget is secured by JWT tokens signed with a secret shared only between your backend code and Fogbender (see [Security](/docs/start-here/security) for details). If users share the same `customerId` (i.e., work at the same company), they'll be able to collaborate with colleagues after signing in.


### Visitor
If you'd like to offer your anonymous website visitors an opportunity to chat with you prior to creating an account or signing in, you can do this by enabling _Visitor key_ under [Embedding instructions](https://fogbender.com/admin/-/-/settings/embed) and setting up a widget for visitors on your landing page (see [Widget configuration: Visitor](/docs/widget-configuration/visitor)).

For an example, open https://fogbender.com and check out our visitor widget on the bottom right.

All visitor conversations end up in a special place called the "Visitor inbox" - under the hood, it functions like a customer (account), but without any public rooms.

Upon entering a room, a visitor has an opporunity to enter and confirm their email:

[![Visitor mode - enter your email](https://fogbender-blog.s3.us-east-1.amazonaws.com/enter-your-email-visitor.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/enter-your-email-visitor.png)

Once an email is confirmed, the visitor can see all Visitor inbox rooms associated with their email address.
