import Config

config :fog, Fog.Mailer, adapter: Bamboo.SesAdapter
config :fog, Fog.Repo, pool_size: 100
