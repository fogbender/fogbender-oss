---
title: End-user management
description: User management in Fogbender
publishDate: "July 23, 2023"
authors:
  - andrei
thumbnailImage: "./assets/fogbender-user-management/thumb.png"
coverImage: "./assets/fogbender-user-management/cover.png"
socialImage: "./assets/fogbender-user-management/social.png"
coverImageAspectRatio: "12:3"
lang: "en"
---

## The data model

From the perspective of a B2B company using Fogbender for B2B customer support, each workspace (e.g. Production or Main) has a list of customers, and each customer has a list of users.

![Fogbender vendor data model](https://fogbender-blog.s3.amazonaws.com/fogbender-vendor-data-model.png)

## User attributes

Each user has the following attributes:

- `User id`
- `User email`
- `User name`
- `User avatar URL`
- `Customer id`
- `Customer name`

`User id` is mapped to the unique user id in the vendor database.

Sometimes, `User id` is the same as `User email` - in systems where this is the case, it's not possible for a user to change their email address.

`Customer id` is the id of the user's organization in the vendor's database, and `Customer name` is its name.

`User name` and `User avatar URL` are optional, everything else is required.

## Ways to import users

### 1. Automatically via token with embedded support widget

Whenever a vendor uses the Fogbender [customer support widget](https://fogbender.com/admin/-/-/settings/embed) on its customer-facing web dashboard (e.g., https://fogbender.com/admin/-/support), the vendor's frontend code instantiates the support widget by passing a secure `token` to a [Fogbender initialization library](https://github.com/fogbender/fogbender-oss).

Customers and users instantiated this way are automatically imported by Fogbender. Vendor agents can see all their customers and users in [the Customers workspace section](https://fogbender.com/admin/-/-/customers):

![Fogbender workspace Customers section](https://fogbender-blog.s3.amazonaws.com/papenhausen-customer.png)

### 2. Automatically via Slack (Customer) integration

If end-users access their B2B support environment with a vendor through [an integrated Slack channel](/blog/fogbender-slack-customer-integration), Fogbender imports such users by assigning a user's Slack email address to `User id`.

### 3. Automatically via Slack (Agent) integration

Whenever end-users receive multiplayer (B2B, team-to-team) customer support from a vendor via a shared Slack channel connected to Fogbender with the [Slack (Agent) integration](/blog/using-a-single-slack-channel-to-safely-monitor-b2b-support-traffic), Fogbender imports Slack users from _the other team_ as users, assigning user Slack emails to `User id`.

### 4. Automatically via Microsoft Teams

The Fogbender [Microsoft Teams integration](/blog/fogbender-msteams-integration) - which works similarly to the Slack (Customer) one - automatically imports users coming from Microsoft Teams, assigning a user's Microsoft Teams email to `User id` in Fogbender. If the vendor is also using the web support widget, as long as a user's email is the same in Microsoft Teams as it is in the vendor's internal database - used to instantiate the Fogbender widget - messages originating in Microsoft Teams and in the web widget will be assigned to the same user in Fogbender.

### 5. Manually via CSV upload

If you've got an existing list of users and customer organizations, you can upload your list manually:

![Manual CSV upload](https://fogbender-blog.s3.amazonaws.com/csv-customer-upload-button.png)

The expected CSV format is as follows:

```
customer_name,customer_id,user_name,user_email,user_id
USS Enterprise,uss001,Captain Kirk,captain.kirk@example.com,k001
USS Enterprise,uss001,Spock,spock@example.com,k002
Millennium Falcon,mil001,Han Solo,han.solo@example.com,s001
Millennium Falcon,mil001,Chewbacca,chewbacca@example.com,s002
Planet Express,px002,Philip J. Fry,fry@example.com,f001
Planet Express,px002,Turanga Leela,leela@example.com,f002
Cyberdyne Systems,cs010,Sarah Connor,sarah.connor@example.com,t001
Cyberdyne Systems,cs010,John Connor,john.connor@example.com,t002
Tyrell Corporation,tyr007,Rick Deckard,rick.deckard@example.com,d001
Tyrell Corporation,tyr007,Rachael,achael@example.com,d002
```

[Download this CSV file](https://fogbender-blog.s3.amazonaws.com/manual_upload_example_blog.csv)

### 6. Manually via 🕵️ Try a live demo!

If you'd like to create a one-off sample user, you can use the 🕵️ **Try a live demo!** available on https://fogbender.com/admin/-/-/settings/embed:

![Try a live demo button](https://fogbender-blog.s3.amazonaws.com/try-live-demo-button.png)

From there, click the purple "Custom profile" button at the bottom:

![Custom profile button](https://fogbender-blog.s3.amazonaws.com/customer-profile-button.png)

Making sure to avoid changing the "Connect to..." section, in the "Connect as..." section, you can specify `User name`, `Customer name`, `Customer ID`, and `Email` - note that `Email` will be used as `User id` -

![Custom profile](https://fogbender-blog.s3.amazonaws.com/custom-profile.png)

## Deleting users

In rare instances, you may encounter a customer organization that has users with civilian email addresses. If a user with a civilian email address loses access to a customer organization, Fogbender has no way of detecting such an event, meaning such a user would continue receiving support email notifications - likely an undesirable scenario, which may result in the customer administrator requesting that you remove such a user from your support environment.

To satisfy such a request, you can use the "Delete user" button on the Customers dashboard:

![Delete user](https://fogbender-blog.s3.amazonaws.com/delete-user.png)

Note that if a deleted user is re-introduced to Fogbender via one of the mechanisms outlined above, the user will become "undeleted".
