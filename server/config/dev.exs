import Config

config :exsync, addition_dirs: ["/priv"]

config :fog, Fog.Mailer, adapter: Bamboo.SesAdapter
# adapter: Bamboo.LocalAdapter

config :fog, Fog.Scheduler, debug_logging: true
