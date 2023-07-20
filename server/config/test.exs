import Config

config :fog, Fog.Repo,
  database: "fogbender_test",
  username: System.get_env("PG_USER"),
  password: System.get_env("PG_PASS"),
  hostname: System.get_env("PG_HOST"),
  port: System.get_env("PG_PORT"),
  migration_timestamps: [type: :utc_datetime_usec],
  pool: Ecto.Adapters.SQL.Sandbox

config :logger, level: :warn

config :fog, Fog.Scheduler, jobs: []

config :fog,
  web_api_enable: true,
  cognito_enable: true,
  scheduler_enable: false,
  notify_badge_enable: false,
  notify_badge_delay: 0,
  s3_file_upload_enable: false

config :fog,
  fog_ip_str: "127.0.0.1",
  fog_port_str: "8001",
  fog_ip:
    "127.0.0.1"
    |> String.split(".")
    |> Enum.map(&String.to_integer/1)
    |> List.to_tuple(),
  fog_port: "8001" |> String.to_integer(),
  fog_api_url: "http://localhost:8001"

config :fog, Fog.Mailer, adapter: Bamboo.TestAdapter

# Integrations
config :fog,
  msteams_renew_job_enable: false
