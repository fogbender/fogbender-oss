# This file is also used as runtime dynamic configuration file for release
# So it should follow next restrictions from https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-runtime-configuration:
# It MUST import Config at the top instead of the deprecated use Mix.Config
# It MUST NOT import any other configuration file via import_config
# It MUST NOT access Mix in any way, as Mix is a build tool and it not available inside releases

import Config

# Database
config :fog, Fog.Repo,
  database: System.get_env("PG_DB"),
  username: System.get_env("PG_USER"),
  password: System.get_env("PG_PASS"),
  hostname: System.get_env("PG_HOST"),
  port: System.get_env("PG_PORT"),
  migration_timestamps: [type: :utc_datetime_usec],
  start_apps_before_migration: [:snowflake],
  after_connect: {Postgrex, :query!, ["SET pg_bigm.similarity_limit TO 0.02", []]}

# Repo
config :fog,
  ecto_repos: [Fog.Repo]

# Web
config :fog,
  fog_ip_str: System.get_env("FOG_IP") || "0.0.0.0",
  fog_port_str: System.get_env("FOG_PORT") || "8000",
  fog_ip:
    (System.get_env("FOG_IP") || "0.0.0.0")
    |> String.split(".")
    |> Enum.map(&String.to_integer/1)
    |> List.to_tuple(),
  fog_port: (System.get_env("FOG_PORT") || "8000") |> String.to_integer(),
  fog_api_url: System.get_env("FOG_API_URL"),
  fog_client_url: System.get_env("FOG_CLIENT_URL"),
  fog_storefront_url: System.get_env("FOG_STOREFRONT_URL")

# File uploads
config :fog,
  file_size_limit: 20_971_520,
  # s3 | local
  file_storage: System.get_env("FILE_STORAGE") || "s3",
  file_storage_local_dir: System.get_env("FILE_STORAGE_LOCAL_DIR") || "/tmp",
  s3_file_upload_bucket: System.get_env("S3_FILE_UPLOAD_BUCKET"),
  s3_file_upload_region: System.get_env("S3_FILE_UPLOAD_REGION") || "us-east-1"

# APIs
config :fog,
  ses_source: System.get_env("SES_SOURCE"),
  ses_region: System.get_env("SES_REGION"),
  cognito_region: System.get_env("COGNITO_REGION"),
  cognito_user_pool_id: System.get_env("COGNITO_USER_POOL_ID"),
  cognito_client_id: System.get_env("COGNITO_CLIENT_ID"),
  fogbender_vendor_id: "v39210325559480320",
  fogbender_vendor_name: "Fogbender",
  fogbender_workspace_id: "w39210328705208320",
  fogbender_workspace_name: "Main",
  # 16 bytes
  secret_key: (System.get_env("FOG_SECRET_KEY_BASE64") || "") |> Base.decode64!(),
  # 16 bytes
  fog_key_prefix: (System.get_env("FOG_KEY_PREFIX") || "") |> Base.url_decode64!(),
  fog_secret_key_base: System.get_env("FOG_SECRET_KEY_BASE"),
  fog_detective_secret_key_base: System.get_env("FOG_DETECTIVE_SECRET_KEY_BASE"),
  web_api_enable: true,
  cognito_enable: System.get_env("COGNITO_USER_POOL_ID") not in [nil, ""],
  scheduler_enable: true,
  notify_badge_enable: true,
  notify_badge_delay: 1000,
  inbox_sqs_url: System.get_env("INBOX_SQS_URL"),
  inbox_domain: System.get_env("INBOX_DOMAIN") || "example.com",
  merge_access_key: System.get_env("MERGE_ACCESS_KEY"),
  openai_api_key: System.get_env("OPENAI_API_KEY"),
  openai_organization_id: System.get_env("OPENAI_ORGANIZATION_ID")

# Integrations

config :fog,
  height_client_id: System.get_env("HEIGHT_CLIENT_ID"),
  height_client_secret: System.get_env("HEIGHT_CLIENT_SECRET"),
  height_redirect_uri: System.get_env("HEIGHT_REDIRECT_URI")

config :fog,
  pagerduty_client_id: System.get_env("PAGERDUTY_CLIENT_ID"),
  pagerduty_client_secret: System.get_env("PAGERDUTY_CLIENT_SECRET"),
  pagerduty_redirect_uri: System.get_env("PAGERDUTY_REDIRECT_URI")

config :fog,
  trello_api_key: System.get_env("TRELLO_API_KEY")

config :fog,
  scraping_bee_api_key: System.get_env("SCRAPING_BEE_API_KEY")

config :fog,
  slack_client_id: System.get_env("SLACK_CLIENT_ID"),
  slack_client_secret: System.get_env("SLACK_CLIENT_SECRET"),
  slack_verification_token: System.get_env("SLACK_VERIFICATION_TOKEN"),
  slack_redirect_uri: System.get_env("SLACK_REDIRECT_URI")

config :fog,
  msteams_client_id: System.get_env("MSTEAMS_CLIENT_ID"),
  msteams_client_secret: System.get_env("MSTEAMS_CLIENT_SECRET"),
  msteams_notification_url: System.get_env("MSTEAMS_NOTIFICATION_URL"),
  msteams_renew_job_enable: true,
  slack_cust_client_id: System.get_env("SLACK_CUST_CLIENT_ID"),
  slack_cust_client_secret: System.get_env("SLACK_CUST_CLIENT_SECRET"),
  slack_cust_verification_token: System.get_env("SLACK_CUST_VERIFICATION_TOKEN"),
  slack_cust_redirect_uri: System.get_env("SLACK_CUST_REDIRECT_URI")

config :fog,
  gitlab_host: "https://gitlab.com",
  github_host: "https://api.github.com",
  asana_host: "https://app.asana.com"

config :fog,
  crm_note_bucket_duration_seconds: System.get_env("CRM_NOTE_BUCKET_DURATION_SECONDS")

config :fog,
  github_tokens: System.get_env("GITHUB_TOKENS")

config :fog,
  stripe_public_key: System.get_env("STRIPE_PUBLIC_KEY"),
  stripe_secret_key: System.get_env("STRIPE_SECRET_KEY"),
  stripe_price_id: System.get_env("STRIPE_PRICE_ID")

config :fog,
  apollo_api_key: System.get_env("APOLLO_API_KEY"),
  geoapify_api_key: System.get_env("GEOAPIFY_API_KEY")

config :logger, :console,
  level: (System.get_env("FOG_LOG_LEVEL") || "debug") |> String.to_atom(),
  format: "\n$time [$level] $message $metadata\n",
  metadata: [:file, :line, :mfa, :pid]

config :snowflake,
  # values are 0 thru 1023 nodes
  machine_id: 1,
  # 2020.01.01, don't change!
  epoch: 1_577_836_800_000

config :tesla, :adapter, Tesla.Adapter.Hackney

config :ueberauth, Ueberauth,
  providers: [
    google:
      {Ueberauth.Strategy.Google,
       [
         request_path: "/google",
         callback_path: "/google/callback",
         default_scope: "email profile"
       ]}
  ]

config :ueberauth, Ueberauth.Strategy.Google.OAuth,
  client_id: {System, :get_env, ["GOOGLE_CLIENT_ID"]},
  client_secret: {System, :get_env, ["GOOGLE_CLIENT_SECRET"]}

config :ex_aws,
  access_key_id: [
    {:system, "AWS_ACCESS_KEY_ID"},
    {:awscli, :system, 10},
    :instance_role
  ],
  secret_access_key: [
    {:system, "AWS_SECRET_ACCESS_KEY"},
    {:awscli, :system, 10},
    :instance_role
  ],
  json_codec: Jason

config :ex_aws_ses,
  json_codec: Jason

# Scheduler
config :fog, Fog.Scheduler,
  jobs:
    [
      unless System.get_env("FOG_EMAIL_DIGEST_JOB_SCHEDULE", "") == "" do
        {{:extended, System.get_env("FOG_EMAIL_DIGEST_JOB_SCHEDULE")},
         {
           Fog.Notify.EmailDigestJob,
           :run,
           [System.get_env("FOG_EMAIL_DIGEST_JOB_BATCH", "1000") |> String.to_integer()]
         }}
      end,
      unless System.get_env("FOG_EMAIL_RECEIVE_JOB_SCHEDULE", "") == "" do
        {{:extended, System.get_env("FOG_EMAIL_RECEIVE_JOB_SCHEDULE")},
         {
           Fog.Notify.EmailReceiveJob,
           :run,
           []
         }}
      end,
      unless System.get_env("MSTEAMS_RENEW_SUBSCRIPTIONS_JOB_SCHEDULE", "") == "" do
        {{:extended, System.get_env("MSTEAMS_RENEW_SUBSCRIPTIONS_JOB_SCHEDULE")},
         {
           Fog.Comms.MsTeams.RenewSubscriptionsJob,
           :run,
           []
         }}
      end,
      {"*", {Fog.Notify.ResolvedTimerJob, :run, []}},
      {"*", {Fog.Ai.EmbeddingsCacheJob, :run, []}},
      {"*", {Fog.Integration.PagerDutyOncallSyncJob, :run, []}}
    ]
    |> Enum.reject(&is_nil/1)

# Disable timezone updates
config :tzdata, :autoupdate, :disabled

# Floki alternative html parser
config :floki, :html_parser, Floki.HTMLParser.FastHtml
