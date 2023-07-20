defmodule Fog.CognitoJwks do
  def child_spec() do
    #   • time_interval (integer() - default 60_000 (1 minute)): time interval
    #   for polling if it is needed to re-fetch the keys;
    # • log_level (:none | :debug | :info | :warn | :error - default :debug):
    #   the level of log to use for events in the strategy like HTTP errors and so
    #   on. It is advised not to turn off logging in production;
    # • should_start (boolean() - default true): whether to start the
    #   supervised polling task. For tests, this should be false;
    # • first_fetch_sync (boolean() - default false): whether to fetch the
    #   first time synchronously or async;
    # • explicit_alg (String.t()): the JWS algorithm for use with the key.
    #   Overrides the one in the JWK;
    # • http_max_retries_per_fetch (pos_integer() - default 10): passed to
    #   Tesla.Middleware.Retry;
    # • http_delay_per_retry (pos_integer() - default 500): passed to
    #   Tesla.Middleware.Retry.

    {Fog.CognitoJwks.FetchingStrategy, time_interval: 24 * 3600_000, explicit_alg: "RS256"}
  end
end

defmodule Fog.CognitoJwks.FetchingStrategy do
  use JokenJwks.DefaultStrategyTemplate

  def init_opts(opts) do
    cognito_region = Application.get_env(:fog, :cognito_region)
    cognito_user_pool_id = Application.get_env(:fog, :cognito_user_pool_id)

    url = "https://cognito-idp.#{cognito_region}.amazonaws.com/#{cognito_user_pool_id}"
    url = url <> "/.well-known/jwks.json"
    # fetch url ...
    Keyword.merge(opts, jwks_url: url)
  end
end
