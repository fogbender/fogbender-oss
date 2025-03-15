---
title: Widget types
description: Learn about the Fogbender widget types
sidebar:
  order: 3
---

A "widget" is what your user sees. Luckily, customer-facing widgets reuse the code from the agent-facing messaging interface, which helps ensure users get access to a messaging product of the same quality as you (the vendor).

We'll cover the available libraries in the [Libraries](/docs/libraries/overview) section and the widget configuration menu under [Widget configuration](/docs/widget-configuration/overview). In this section, we'll take you through a cursory tour of different widget types: roomy, floaty, headless, and standalone.

### Roomy

The roomy widget is our favorite - essentially, it's a full-blown team messaging experience embedded into your customer dashboard.

The roomy widget is designed to take up all the room alotted to its parent container, and does play nice with small screens. For a demo, you can impersonate Alice and Bob from the [Install widget onboarding section](http://localhost:3100/admin/-/onboarding/widget) (please use a Chromium browser, otherwise resizing controls may not work).

### Floaty

The floaty widget is similar to the Intercom one - a clickable thingy in the bottom right corner.

### Headless

The sole purpose of the headless widget is to be able to embed an unread messages badge in your user interface - say, next to a "Support" link, which leads to a dedicated support page featuring the roomy widget.

### Standalone

The standalone widget opens in its own browser window or tab. For a demo, download the Harry Potter file from the [Install widget onboarding section](http://localhost:3100/admin/-/onboarding/widget) and open it.
