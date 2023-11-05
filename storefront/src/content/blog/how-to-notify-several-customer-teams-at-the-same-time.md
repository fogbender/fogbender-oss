---
title: "How to notify several customer teams at the same time"
description: "How to use Fogbender to support customers who prefer Microsoft Teams"
publishDate: "February 28, 2023"
authors:
  - andrei
thumbnailImage: "./assets/how-to-notify-several-customer-teams-at-the-same-time/thumb.png"
socialImage: "./assets/how-to-notify-several-customer-teams-at-the-same-time/social.png"
coverImage: "./assets/how-to-notify-several-customer-teams-at-the-same-time/cover.png"
coverImageAspectRatio: "12:2"
lang: "en"
---

Occasionally, multiple customers may report the same bug or request the same feature.

When this happens, it's nice to have a single ticket for the issue in the developer-facing tracker (instead of one per customer), while keeping a record of all customers waiting for its completion.

When using Fogbender, this can be done by associating customer-facing conversations with a ticket in an external system.

In the example below, two customer teams - Tractors Unlimited and Sailing Ships - are waiting for a particular API (the middle- and right-most) panes, and the left-most pane is the internal "hub" for this particular feature.

![image](https://fogbender-blog.s3.amazonaws.com/issue-hub.png)

For example, if someone on the R&D team marks #489 as closed, the customer-facing agents will be notified of this in the internal (green) room.

![image](https://fogbender-blog.s3.amazonaws.com/gh-closed-message.png)

This internal room associated with issue #489 can also be used to "broadcast" an update to all related customer-facing rooms.

The first step is to compose a message or a block of messages you'd like to broadcast to the customer teams. You can ask others to contribute or proofread; the messages can contain images and code blocks.

For example, below is a possible broadcast for the customers waiting on the completion of issue #489:

![image](https://fogbender-blog.s3.amazonaws.com/broadcast-message-block.png)

Once you're happy with the content, select all the messages you'd like to share with customers and click "Forward or file N messages":

![image](https://fogbender-blog.s3.amazonaws.com/broadcast-message-block-selected.png)

This brings up a modal where you can navigate to the "Related rooms" tab and select the customers you'd like to notify:

![image](https://fogbender-blog.s3.amazonaws.com/forward-to-related-rooms-modal.png)

After clicking "Broadcast to N rooms", the block of messages is "forwarded" to all selected rooms:

![image](https://fogbender-blog.s3.amazonaws.com/forwarded-messages.png)

At this point, you may choose to wait for a response from every customer team to confirm that everything is working as expected before closing each customer-facing room.

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/d0297aebffb846ccbf79950acaee2de6" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
