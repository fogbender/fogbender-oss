---
title: "How to configure the Fogbender Jira integration"
description: "How to configure the Fogbender Jira integration"
publishDate: "May 2, 2022"
authors:
  - andrei
socialImage: "/assets/blog/default/social.jpg"
coverImage: "/assets/blog/default/cover.jpg"
lang: "en"
---

Once configured, the Fogbender Jira integration makes it possible to file Jira tickets directly from a conversations with a customer team.

To configure the integration, go to the Settings section of your Fogbender workspace:

![image](https://fogbender-blog.s3.amazonaws.com/home-settings-link.png)

Under Integrations, click the "ADD INTEGRATION" button and select "Jira" from the dropdown.

![image](https://fogbender-blog.s3.amazonaws.com/jira-modal.png)

1\. **Jira URL →** For example, if your Jira issue dashboard is located at

    https://alan217.atlassian.net/jira/software/c/projects/AT0/issues/?filter=allissues

your Jira URL is

    https://alan217.atlassian.net

2\. **Jira user →** We recommend creating a new non-admin Jira account for this integration. One option is to create an email group such as jira@yourcompany.domain, and use this email for the new Jira account.

3\. **Project key →** For the Jira URL above, the project key is

    AT0

4\. **API token →** Once the new Jira account is created, sign in with the new account and create an API token here: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

5\. **Webhook URL →** You need admin privileges to configure webhooks, so sign in with your admin Jira account and follow the URL in step 5.

Add `labels = fogbender` in the JQL query input and select all options under **Issue** and **Comment**.

![image](https://fogbender-blog.s3.amazonaws.com/jira-webhook-setup.png)

Then, click "Create" at the bottom of the page.

<div style="position: relative; padding-bottom: 62.5%; height: 0;"><iframe src="https://www.loom.com/embed/c3d140e970da469490c0b3199bc13f78" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
