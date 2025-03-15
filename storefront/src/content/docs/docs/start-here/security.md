---
title: Security
description: Fogbender security
---

We invite you to consider security at Fogbender from two perspectives: organizational security and product security. Organizational security covers aspects like ensuring engineers don't manage cleartext passwords in the codebase and that database backups are stored in encrypted form. Product security focuses on questions such as, "Why can’t user Alice impersonate user Bob in a customer support conversation?"

#### Organizational security

Fogbender is _SOC 2 Type I_-certified. To learn more, please visit https://fogbender.com/security.

#### Product security

If you've built a SaaS product, you've likely put significant effort into user authentication—whether by using a service like [Clerk](https://clerk.com/), [PropelAuth](https://www.propelauth.com/), or [SuperTokens](https://supertokens.com/), or by going all in and rolling your own.

Whenever your user opens a Fogbender messaging widget, our challenge is to securely relay their identity—confirmed by your application's authentication—to the Fogbender backend.

We do this by providing your backend with a **never-to-be-published** secret (available in https://fogbender.com/admin/-/-/settings/embed). Your backend then uses this secret to sign a JWT containing a set of claims you provide about the user—`id` at minimum, but optionally `name`, `email`, `customerId`, and more.

This JWT is then set as the `userJWT` value when assembling a Fogbender token, which is used to instantiate the widget:

```diff lang="js"
  import { FogbenderSimpleWidget } from "fogbender-react";

  const token = {
    widgetId: "dzAwNjg4NDY0NjI4NzgyNDY5MTIw",
    userJWT: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2...",
    customerId: "C256434",
    customerName: "Netflix",
    userId: "U234328",
    userEmail: "alice@netflix.com",
    userName: "Alice Chesterton",
  };

  <FogbenderSimpleWidget token={token} />
```

Let's map this out one more time as a list and a sequence diagram:

- Your user (Alice) asks your backend to sign her into your [web] application
- Your backend signs Alice in after agreeing that her credentials look good
- While rendering the support widget, your application asks your backend for a `userJWT` for Alice
- Your backend calls Fogbender's `/signatures` API (or uses a crypto library) to generate a JWT with Alice's details—known from the session; this call is secured (via `Authentication` header) by the secret shared between Fogbender and your backend
- Fogbender returns a JSON object that looks like `{ "signatures": { "userJWT": ... }}`
- Your backend returns the value of `userJWT` to your application
- Your application constructs a Fogbender token and uses it render the support widget for Alice

[![](https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-signatures-sequence-diagram.png)](https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-signatures-sequence-diagram.png)

<!--
https://mermaid.js.org/syntax/sequenceDiagram.html

sequenceDiagram
    Your app (Alice)->>Your backend: Sign in Alice please
    Your backend->>Your app (Alice): Signed in!
    Your app (Alice)->>Your backend: Generate Fogbender userJWT for Alice
    Your backend->>Fogbender: Call /signatures API with Fogbender secret and Alice's info
    Fogbender->>Your backend: Here you go: { signatures: ... }
    Your backend->>Your app (Alice): Here you go: userJWT
    Your app (Alice)->>Fogbender: Permission to render widget for Alice with userJWT
    Fogbender->>Your app (Alice): Verified, render away!
-->
