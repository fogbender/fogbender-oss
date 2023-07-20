---
title: "How to Verify Domain Ownership with a DNS TXT Record"
description: "Verifying domain ownership by updating a DNS TXT record to enable colleagues to auto-join your Fogbender team"
publishDate: "December 25, 2022"
authors:
  - andrei
thumbnailImage: "/assets/blog/how-to-verify-domain-ownership/thumb.png"
socialImage: "/assets/blog/how-to-verify-domain-ownership/social.png"
coverImage: "/assets/blog/how-to-verify-domain-ownership/cover.png"
coverImageAspectRatio: "20:2"
lang: "en"
---

In general, to allow folks with an email address associated with a particular domain to join your Fogbender team automatically as Readers, you must a) be an owner or admin of the Fogbender team in question and b) prove you own the domain by creating or updating its TXT DNS record.

Just a reminder that Reader access means the following:

- No access to administrative functions, such as team management, integrations, billing, settings, etc
- Read-only access to customer-facing rooms
- Read and write access to Internal Conversations (kind of like free Slack or Microsoft Teams)

Since creating or updating DNS records is a bit of a pain, we make an exception for one specific scenario: if you're an owner of the team in question, you can easily allow auto-join Reader access from emails matching the domain of your email address by answering "Yes" here:

![img](/assets/blog/how-to-verify-domain-ownership/exception.png)

To do it the hard way, or to verify additional domains, add your domain, update your DNS TXT record, and click "Verify". For instructions on how to actually add or modify a DNS TXT record, please consult with the most appropriate article from the following list:

- [Bluehost](https://www.bluehost.com/help/article/dns-management-add-edit-or-delete-dns-entries)
- [HostGator](https://www.hostgator.com/help/article/i-bought-my-domain-from-hostgator-how-do-i-make-dns-changes)
- [GoDaddy](https://www.godaddy.com/help/add-a-txt-record-19232)
- [SiteGround](https://www.siteground.com/kb/manage-dns-records/)
- [A2 Hosting](https://www.a2hosting.com/kb/a2-hosting-products/email-hosting/setting-up-dns-records-for-professional-and-pro-plus-email-hosting)
- [Amazon Web Services](https://aws.amazon.com/premiumsupport/knowledge-center/route-53-configure-long-spf-txt-records/)
- [iPage](https://www.ipage.com/help/article/dns-management-how-to-update-txt-spf-records)
- [Liquid Web](https://www.liquidweb.com/kb/how-to-add-or-modify-dns-records-in-manage/)
- [Cloudways](https://support.cloudways.com/en/articles/5241822-how-to-merge-multiple-spf-records)
- [Google Domains](https://university.webflow.com/lesson/verify-domain-ownership-using-txt-records)
- [Route 53](https://aws.amazon.com/premiumsupport/knowledge-center/route-53-configure-long-spf-txt-records/)
