---
title: "Using groups to configure on-call agents"
description: "Introducing agent groups, assigning groups to rooms, default group assignment, and PagerDuty integration to automate on-call group membership"
publishDate: "March 26, 2023"
authors:
  - andrei
thumbnailImage: "./assets/using-groups-to-configure-oncall-agents/thumb.png"
socialImage: "./assets/using-groups-to-configure-oncall-agents/social.png"
coverImage: "./assets/using-groups-to-configure-oncall-agents/cover.png"
coverImageAspectRatio: "12:2"
lang: "en"
---

Whenever a new user asks a question in support, who on the vendor’s end should be notified?

Of the possible options — "everyone", "someone", and "nobody" — we’ve so far focused on ensuring it’s never the latter, by notifying everyone.

This works well for early startups, where support conversations are anything but routine — they are precious signs of life on otherwise hostile and questionable worlds.

For established teams, however, the answer must be a version of "someone", that, depending on the situation, is smart enough to deal with work shifts, time zones, vacations, and offsites.

Below, we introduce four new features designed to address some of these concerns.

## 1. Agent groups

To create an agent group, head to <a href="https://fogbender.com/admin/-/team" target="_blank">https://fogbender.com/admin/-/team</a> and look for the “Groups” section. Once there, you can create a group, for example “oncall” or “devops”, and populate the group with agents.

Note that if you delete a group and then create a group with the same name, the previous group membership will be retained. Also, note that the group “all” is always there by default.

## 2. Assigning groups to rooms

Once your group is ready, you can use the assignment control the room header — just below the close button — and select (or search for) the group in the dropdown:

![img](https://fogbender-blog.s3.amazonaws.com/room-group-assignment-00.png)

Once assigned, only group members (as well as other room assignees, if any) will be notified on new messages. Multiple groups can be assigned at the same time.

Note that if a room’s only assignee is a group with no members, it’s equivalent to “no assignees”, which means all agents will be notified on new messages. Also note that a mention always triggers a notification, even if the mentionee is not assigned directly or as a group member.

## 3. Default group assignment

To avoid having to manually assign groups to customer-facing rooms and to ensure all new customer-facing rooms are automatically assigned to the appropriate agent group, you can use the **Default group assignment** setting in <a href="https://fogbender.com/admin/-/-/settings/notifications" target="_blank">workspace notifications</a>.

![img](https://fogbender-blog.s3.amazonaws.com/room-group-assignment-01.png)

## 4. PagerDuty integration

Since updating the list of on-call agents manually is rather cumbersome, you can automate this process by integrating Fogbender with PagerDuty under <a href="https://fogbender.com/admin/-/-/settings/integrations" target="_blank">Incident response integrations</a>.

Once you’ve successfully authenticated PagerDuty, create or select an existing group to sync with the result of PagerDuty’s <a href="https://developer.pagerduty.com/api-reference/3a6b910f11050-list-all-of-the-on-calls" target="_blank">/oncalls</a> API, which lists all the PagerDuty users in your account who are currently on call.

![img](https://fogbender-blog.s3.amazonaws.com/room-group-assignment-02.png)

Note that if you’re using an existing group for this integration, its membership will be overridden.

<small>The photo (cropped and enhanced) of the Motorola Bravo Express pager used as a thumbnail for this post is by <a href="https://www.flickr.com/photos/hades2k">hades2k</a>, published under the <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a> license.</small>
