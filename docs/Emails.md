# Emails

## Overview

We are using [Bamboo Mailer](https://hexdocs.pm/bamboo/Bamboo.Mailer.html) lib for sending emails.
Emails templates are EEx files in `server/priv/emails/` dir: `xxx.html.eex` for HTML and `xxx.txt.eex` for plain text.

Emails generated and sent via `Fog.Email.XXX` modules.

## Dev configuration

There are two options for development. Set in `config/dev.exs` file:

1. Using AWS SES for sending real emails.

```
config :fog, Fog.Mailer,
  adapter: Bamboo.SesAdapter
```

also needs `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your `local.env` file.

2. Using local sender with simple web interface for observing sent emails:

```
config :fog, Fog.Mailer,
  adapter: Bamboo.LocalAdapter
```

Go to `http://localhost:8000/public/emails` to see emails processed by Bamboo Mailer.

## Email Digest

Controlled by FeatureOptions:

- `email_digest_enabled`: true/false
- `email_digest_period`: integer time in seconds between digests/activities

To enable Digest, set:

`Repo.FeatureOption.set(agent, email_digest_enabled: true, email_digest_period: 60, email_digest_template: "email_digest2")`

To enable Digest with user triage following, set:

`Repo.FeatureOption.set(agent, email_digest_enabled: true, email_digest_period: 60, email_digest_template: "email_digest2", user_triage_following: true)`
