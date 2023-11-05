---
title: "Helping the unauthenticated with the Unknown User Widget"
description: "How to use the Unknown User Widget in Fogbender to guide those without accounts or struggling to sign in to their home helpdesk"
publishDate: "March 30, 2023"
authors:
  - andrei
thumbnailImage: "./assets/unknown-user-widget/thumb.png"
socialImage: "./assets/unknown-user-widget/social.png"
coverImage: "./assets/unknown-user-widget/cover.png"
coverImageAspectRatio: "14:2"
lang: "en"
---

In the glorious future, B2B users will always have accounts in their respective organizations and will always be able to sign in without difficulties.

In the humble present, all sorts of complications arise when it comes to B2B user account management. For example:

- Some B2B companies forget to add account management altogether. They might have a single user account shared by an entire customer organization.

- Companies that offer an API (or SDK) may have users who interact with the API through an authentication token tied to a specific customer organization. Such users may not necessarily have individual user accounts within that customer organization.

- A user may have an account within a customer organization, but is having issues signing in and cannot get a hold of (or doesn’t know the identity of) the account administrator.

To help mitigate some of these issues, Fogbender provides a feature called the “Unknown User Widget”. This widget is designed to connect an unauthenticated user to the vendor’s support team at the minimum, and&mdash;ideally&mdash;to their own team as well, by using the following workflow:

- An unauthenticated user enters their email and (optionally) name in a form (Fogbender iframe) hosted on the vendor’s website
- The user receives an email with link leading to a Fogbender room connecting the user with the vendor’s support team
- If the user’s email domain matches a domain associated with a customer, the user gains access to that customer’s helpdesk (Triage and other non-private rooms)

The easiest way to understand how this feature works from the end user’s perspective is to go through the Unknown Widget Flow on our demo site: https://demo1.fogbender.com/support-unknown-user.

To see what the feature looks like from the perspective of a support agent, follow the “Try a live demo!” link on your <a href="https://fogbender.com/admin/-/-/settings/embed" target="_blank">widget embedding instructions page</a>, select any profile, then click on the “Support (Unknown User)” tab.

There are two steps involved&mdash;one mandatory, one optional&mdash;in configuring the Unknown User Widget.

## Step 1. Install the Unknown User Widget

In order to install the widget, you’ll need to get your _widgetId_ and _widgetKey_ from your <a href="https://fogbender.com/admin/-/-/settings/embed" target="_blank">workspace configuration page</a>.

Note that using the _widgetKey_ for the Unknown User Widget does not pose a serious security risk, but if you’d like to harden your installation by making sure that your widget can only be loaded from your domain, just let us know.

For the full-width widget, like the one on https://demo1.fogbender.com/support-unknown-user, you can use the following code:

```
import { FogbenderProvider, FogbenderConfig, FogbenderIsConfigured,
  FogbenderHeadlessWidget, FogbenderFloatingWidget } from "fogbender-react";

const token = {
  widgetId: <YOUR WIDGET ID>,
  widgetKey: <YOUR WIDGET KEY>
};

<FogbenderProvider>
  <FogbenderConfig token={token} />
  <FogbenderIsConfigured>
    <FogbenderHeadlessWidget />
    <FogbenderFloatingWidget />
  </FogbenderIsConfigured>
</FogbenderProvider>
```

For the floating widget, like the one on https://demo1.fogbender.com/showcase with the "Unknown user flow" checkbox enabled, you can use the following code:

```
import {
  FogbenderProvider,
  FogbenderConfig,
  FogbenderIsConfigured,
} from "fogbender-react";

const token = {
  widgetId: <YOUR WIDGET ID>,
  widgetKey: <YOUR WIDGET KEY>
};

<FogbenderProvider>
  <FogbenderConfig token={token} />
  <FogbenderIsConfigured>
    <FogbenderWidget />
  </FogbenderIsConfigured>
</FogbenderProvider>
```

If you don’t use React, you can use the Web Components approach from https://www.npmjs.com/package/fogbender-element. For a working example and the corresponding code, see https://codepen.io/jlarky/pen/vYjVYxM?editors=1000.

## Step 2. Add domains to customers

If you went through the support agent demo, you may have noticed that the room associated with the user’s email ended up in a place called “Shared Email Inbox”. All users without an obvious home end up in this inbox, which a special “customer” that does not have a Triage room.

Say you’ve got a customer organization where your product champion wants all users with email addresses matching the customer organization’s domain (or domains) to end up in the helpdesk–with Triage and all other rooms–tied to the customer organization.

To fulfill this wish, you’d need to:

- Determine which domain or domains to associate with the customer

- Add all associated domains to the customer in question in the <a href="https://fogbender.com/admin/-/-/customers" target="_blank">Customers dashboard</a>

![img](https://fogbender-blog.s3.amazonaws.com/unknown-user-widget-00.png)

There are certain scenarios that would cause a user with an email domain associated with a customer to end up in the Shared Email Inbox nonetheless:

- The user’s email address is associated with users in more than one customer
- The user’s email domain is associated with more than one customer
