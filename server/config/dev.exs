import Config

config :exsync, addition_dirs: ["/priv"]

config :fog, Fog.Mailer,
  adapter:
    if(System.get_env("SES_REGION") in [nil, ""],
      do: Bamboo.LocalAdapter,
      else: Bamboo.SesAdapter
    )

config :fog, Fog.Scheduler, debug_logging: true

config :fog, Fog.Repo, pool_size: 15
