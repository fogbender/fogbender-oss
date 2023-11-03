---
title: "Introducing the Fogbender Customer-side Microsoft Teams Integration"
description: "How to use Fogbender to support customers who prefer Microsoft Teams"
publishDate: "September 5, 2022"
authors:
  - andrei
thumbnailImage: "./assets/fogbender-msteams-integration/thumb.png"
socialImage: "./assets/fogbender-msteams-integration/social.png"
coverImage: "./assets/fogbender-msteams-integration/cover.png"
coverImageAspectRatio: "20:2"
lang: "en"
---

What are the benefits of company-wide team messaging channels over, say, email?

In short - access. Any current or future employee has access to the information in a company-wide messaging channel. For email, this is only true for those individuals or groups explicitly listed as recipients of a message [0][1].

While there are countless scenarios where the "need to know" restriction to information is beneficial to running complex organizations, one area where it's pretty much never the case is customer support.

A company C that signs a multi-year deal with a cloud computing vendor V has little reason to shield support conversations with V's agents from its employees, and every insentive to do the opposite: to ensure smooth knowledge transfer between departing and incoming colleagues and to facilitate knowledge sharing in general.

This is exactly why company C might invite vendor V's agents as guests to a dedicated Microsoft Teams channel and require - sometimes contractually - that this channel serves as the default information condiuit between company C and vendor V.

Leaving aesthetic considerations aside (vendor V might be team Slack, etc), the main issue for vendor V in this scenario is that Microsoft Teams is not a customer support platform, making standard customer support things - like assigning conversations to specific agents, associating conversations to tickets in Jira, sharing internal notes, receiving dropped ball notifications, and the like - are impossible.

Fogbender - our product - _is_ such a customer support platform, but, until today, even if vendor V offered support through Fogbender to its customers, a request by a customer to use Microsoft Teams instead would have negated all the benefits afforded by Fogbender to the vendor.

Today, we're announcing a Fogbender-Microsoft Teams integration that bridges the gap.

[0] - If it appears difficult to keep track of threads in Microsoft Teams, Slack, Facebook, or any other threaded messaging system, consider the threading model of email: it's a graph that with a single limitation on expansion: can't go back in time - anything else is fair game.

[1] - Some companies take the group idea seriously. For some pre-Slack email wisdom from Stripe check out https://stripe.com/blog/scaling-email-transparency
