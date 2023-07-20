---
title: Using a single Slack channel to safely monitor B2B support traffic
description: The Fogbender (Agent) integration is a way to monitor and respond to customer support conversations originating in email, Microsoft Teams, Shared Channels, or the in-app widget
publishDate: "July 10, 2023"
authors:
  - andrei
thumbnailImage: "/assets/blog/using-a-single-slack-channel-to-safely-monitor-b2b-support-traffic/thumb.png"
coverImage: "/assets/blog/using-a-single-slack-channel-to-safely-monitor-b2b-support-traffic/cover.png"
socialImage: "/assets/blog/using-a-single-slack-channel-to-safely-monitor-b2b-support-traffic/social.png"
coverImageAspectRatio: "29:8"
lang: "en"
---

Overall, B2B support is hard. This is mainly a function of product complexity: B2B products tend to be significantly more sophisticated than consumer-focused ones, often requiring deep, technical knowledge from the support organization to ensure customer success. (This means that "support organization" at many complex-product B2B companies tends to be roughly synonymous with "R&D department".)

However, there is one area where B2B has B2C beat: a B2B company needs to mind way fewer "front doors" than a B2C one. Consumers want to be supported on the likes of Instagram, Facebook Messenger, Twitter, iMessage, SMS, WhatsApp, Telegram, Viber, Line, WeChat, TikTok, email, in-app chat, and voice - with Threads and Bluesky Social for Business coming soon.

In comparison, the number of B2B "front doors" is quite limited, with the most common options being

- A support email inbox (usually support@company-domain), which may or may not have a customer-facing portal
- Some sort of in-app chat
- A shared Slack channel per customer
- A Microsoft Teams channel per customer (could be [a shared one as well](https://learn.microsoft.com/en-us/microsoftteams/shared-channels))

Support activity may also happen in public forums (or "communities," usually run on IRC, Discourse, Discord, Slack), on public social media or personal (i.e., not group) emails - dealing with these is beyond the scope of this article, but be sure to check out https://www.linen.dev/, a new product addressing this market.

Perhaps because there aren't all that many ways for B2B customers to interact with vendors, we haven't yet heard a piercing, begging cry for a "unified inbox for team-to-team-based support" product - a sort of a [Front](https://front.com) for B2B - from the B2B SaaS market. In fact, virtually all traditional vendors of customer support software tend to home in on serving consumer-focused businesses fairly explicitly - we explore this phenomenon at length in our post titled [Why are all customer support tools designed for B2C companies?](/blog/why-all-customer-support-tools-designed-for-btc)

## Concerns

What we hear instead of a piercing, begging cry is more a moan of annoyance, but it's getting louder. It's getting louder, because even with just a handful of "front doors" a company needs to mind, as business picks up and intensity grows, concerns mount. Which concerns? Particularly when we look at companies that don't have a well-defined support function (i.e., all engineers and product managers do support), a non-exhaustive sampler of concerns could be something like

- What should I monitor?

- Who else is seeing it?

- How can I tell is someone else has seen it?

- Whose job is it to respond?

- Who _can_ respond?

- Who _must_ respond?

- How to not drop the ball on following up?

- How to associate a new support complaint with an ongoing, known issue?

All good questions, but in this post we'll focus on the first one - what should I monitor?

For companies that run on Slack, "a public channel" tends to be an excellent answer.

## The world "channel" should've stayed in IRC, really

Channels are chat rooms with names that start with # - for public rooms within a workspace - or 🔒 - for private. By the way, the term "channel" is often incorrectly used to refer to "workspace", like in this headline by The Daily Beast:

![Slack channel misused](https://fogbender-blog.s3.amazonaws.com/slack-channel-term-misuse.png)

## The lab part 🔬

In the lab part of this article, we'll see how to configure a Slack channel for monitoring all B2B support traffic with Fogbender. The integration is "selectively two-way", meaning those Slack users who have corresponding accounts and roles in Fogbender, can respond from Slack as well - this is the origin of the word "safely" in the post's title.

In Fogbender, all this is done with a creatively-named **Slack (Agent)** integration - "(Agent)" is there to distinguish this integration from the **Slack (Customer)** one, which we covered in our previous post, titled [Customer Communication in Slack without Slack Connect or Shared Channels](/blog/fogbender-slack-customer-integration).

You'll find the **Slack (Agent)** integrations in the Comms integrations section of [workspace settings](https://fogbender.com/admin/-/-/settings/integrations#comms-integrations). Once installed, it would look like this:

![Slack (Agent) integration in settings](https://fogbender-blog.s3.amazonaws.com/slack-agent-integration-settings.png)

During installation, the Slack (Agent) integration will create a channel called `#fogbender` in your Slack workspace. If you already have a `#fogbender` channel, it'll create one named `#fogbender1`, and so on.

Once enabled, it will begin spawning a new thread for every new conversation originating in email (if you use the email forwarding feature in Fogbender), a Microsoft Teams connection, the web widget, a Slack (Customer) connection, or a known (i.e., one that has been associated with a customer) shared Slack channel.

## Testing the Slack (Agent) integration all by yourself

To test the new setup, you can send a message as a customer by using the [🕵️ Try a live demo!](https://fogbender.com/admin/-/-/settings/embed) feature under Embedding instructions:

![Try a live demo](https://fogbender-blog.s3.amazonaws.com/try-a-live-demo.png)

Now, if you type a message in the customer Triage room (left pane), then respond from the [Fogbender agent UI](https://fogbender.com/admin) (middle pane), you'll see the exchange appear in Slack (right pane).

![Real-time sync between Fogbender and Slack](https://fogbender-blog.s3.amazonaws.com/demo-agent-slack.png)

Let's see what happens when an agent responds from Slack:

![Agent responds from Slack](https://fogbender-blog.s3.amazonaws.com/agent-responds-from-slack.png)

It works! It works, because Fogbender matched the email of the Slack user to the email of an agent. Let's see what happens when a Slack user without a corresponding Fogbender account tries to respond:

![Slack user without Fogbender account tries to respond](https://fogbender-blog.s3.amazonaws.com/slack-user-without-agent-account.png)

It's admittedly very rare to have someone on the vendor's side send uncouth comments straight to the customer, but it does happen. While it's generally beneficial for all members of the vendor's organization to have read access to customer communication, it's also a great idea to have a "write" stopgap in place, to avoid crisis management scenarios just because someone typed some words and hit Enter.

## Existing shared channel with customer already in place, what to do?

What if Sailing Ships - the customer - already has a shared channel open with the vendor? The **Slack (Agent)** integration lets you associate a shared channel with a customer in Fogbender, which - aside from synchronizing the messages in the web support widget with the shared channel, and vice versa - routes activity from all the associated shared channels to the single `#fogbender` one, making it much easier to monitor shared channel activity.

To create an association, open the **Slack (Agent)** integration modal, select the shared channel in the left dropdown, the customer in the right one, and hit CREATE:

![Creating an association between a shared channel and a customer in Fogbender](https://fogbender-blog.s3.amazonaws.com/creating-shared-channel-customer-association.png)

![Completed association between a shared channel and a customer in Fogbender](https://fogbender-blog.s3.amazonaws.com/shared-channel-customer-association.png)

Now, let's see what happens when a customer posts a message in the shared channel:

![Message sync between shared channel and Fogbender](https://fogbender-blog.s3.amazonaws.com/shared-channel-sync.png)

1. Customer posts a message in a shared channel (we're looking at the vendor's side)

1. The same message shows up in the Triage room of the web widget (customer view)

1. The same message shows up in the Triage room of the agent UI (vendor view)

1. The same message shows up in the `#fogbender` channel thread associated with the Sailing Ships Triage (vendor view)

1. Because there's been over an hour of inactivity in this particular room, the message is also sent to the parent channel (vendor view)

## They also want support in Microsoft Teams 🤦

Next, let's assume Sailing Ships _also_ has a Microsoft Teams channel connected to the same topology:

![Message sync between MS Teams, shared channels, and Fogbender](https://fogbender-blog.s3.amazonaws.com/ms-teams-fogbender-sync.png)

(To learn more about the Microsoft Teams integration with Fogbender, https://fogbender.com/blog/fogbender-msteams-integration)

Here's what's happening in the above image:

1. Customer posts a message with an image in a connected Microsoft Teams channel (customer view)

1. The same message and image appear in the Triage room in the web widget (customer view)

1. The same message and image appear in the Triage thread of the `#fogbender` channel (vendor view)

1. The same message and image appear in the vendor end of the shared channel (vendor view)

1. The same message and image appear in the Sailing Ships Triage room of the agent UI (vendor view)

_Not_ shown above is the customer end of the shared channel. Here is what it looks like:

![](https://fogbender-blog.s3.amazonaws.com/ms-teams-fogbender-sync-customer-slack.png)

So far, we've seen that the `#fogbender` Slack channel can be used to monitor customer support messages coming from the web widget, connected Slack shared channels, and connected Microsoft Teams channels.

## Love email 😃

Finally, let's see what it looks like for emails sent to the team inbox (usually `support@company-domain` email address).

Every Fogbender workspace has a unique email forwarding address:

![Workspace email forwarding settings](https://fogbender-blog.s3.amazonaws.com/email-forward-settings.png)

If you're already using a Google Workspace group to handle inbound emails, you can configure forwarding of those emails to Fogbender by [following the instructions from HelpScout](https://docs.helpscout.com/article/78-auto-forwarding-from-a-google-workspace-group).

Here's the email in the sent folder:

![Composing an email requesting help](https://fogbender-blog.s3.amazonaws.com/email-compose.png)

Here's the email appearing in the `#fogender` channel thread in Slack:

![Inbound email in #fogbender Slack channel](https://fogbender-blog.s3.amazonaws.com/email-in-fogbender-channel.png)

(Note: we've got some work to do on email parsing)

Here's the email appearing in the Shared Email Inbox in Fogbender admin UI:

![Shared Email Inbox message in Fogbender admin UI](https://fogbender-blog.s3.amazonaws.com/shared-inbox-message.png)

Had the author of email been a known user, the conversation would instead be assigned to the user's customer, instead of the generic "Shared Email Inbox".

## In conclusion

All this "front door" business in B2B is clearly a rather unfortunate travesty. The only reason it exists is because vendors don't offer embedded customer portals - ones where a customer team can see a list of their open issues, engage in both real-time and asynchronous discussions amongst themselves and the vendor's support team, and search all past support conversations.

Fogbender offers such a portal via its embeddable web widget but also enables vendors stuck in front door minding hell to establish two-way connectivity between existing front doors and Fogbender - the new system of record for B2B customer support.
