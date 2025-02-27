defmodule Fog.CORS do
  require Logger

  use Corsica.Router,
    # if we set `origins: "*"` while it works it has almost all vulnerabilities explained in the article https://portswigger.net/research/exploiting-cors-misconfigurations-for-bitcoins-and-bounties so we are doing more thorough white listing instead
    origins: [{__MODULE__, :check_origin}],
    allow_credentials: true,
    allow_headers: ["content-type", "openai-api-key"],
    max_age: 600

  resource("/api/client/*", origins: [{__MODULE__, :check_authority_only}])
  resource("/*")

  def check_authority_only(origin) do
    uri = URI.parse(origin)
    uri = %{uri | authority: nil}

    # resetting `authority` and checking that it produces the same url bans origins that are like `https://localhost sdfvksnfnv`

    URI.to_string(uri) === origin
  end

  def check_origin(origin) do
    uri = URI.parse(origin)
    uri = %{uri | authority: nil}

    # resetting `authority` and checking that it produces the same url bans origins that are like `https://localhost sdfvksnfnv`

    URI.to_string(uri) === origin and check_origin_with_fixed_authority(uri)
  end

  defp check_origin_with_fixed_authority(uri) do
    %URI{
      authority: nil,
      fragment: nil,
      host: host,
      path: nil,
      port: port,
      query: nil,
      scheme: scheme,
      userinfo: nil
    } = uri

    fog_ip = Application.get_env(:fog, :fog_ip) |> Tuple.to_list() |> Enum.join(".")

    case {scheme, host, port} do
      {"http", "localhost", 3100} ->
        true

      {"http", "localhost", 3101} ->
        # 'yarn start' will start on 3101 if 3100 is taken by 'yarn dev'
        true

      {"http", "localhost", 5173} ->
        true

      {"http", ^fog_ip, 3100} ->
        true

      {"http", "dev00.fogbender-test.com", 3100} ->
        true

      {"https", hostname, 443} ->
        check_origin_hostname(hostname)

      _ ->
        # Logger.debug("unsupported origin", origin: URI.to_string(uri))
        false
    end
  end

  defp check_origin_hostname(hostname) do
    allowedHosts = [
      # prod
      {:exact, "fogbender.com"},
      # test
      {:exact, "fogbender-test.com"},
      {:exact, "fb-storefront.netlify.app"},
      {:netlify, "--fb-storefront.netlify.app"},
      # soc2 test
      {:exact, "fogbender-net.netlify.app"},
      # beta-prod
      {:exact, "beta.fogbender.com"},
      # beta-test
      {:exact, "beta.fogbender-test.com"},
      {:exact, "fb-storefront-beta.netlify.app"},
      {:netlify, "--fb-storefront-beta.netlify.app"}
    ]

    Enum.any?(allowedHosts, fn
      {:exact, allowed} ->
        hostname == allowed

      {:netlify, allowed} ->
        String.match?(hostname, ~r/^[[:alnum:]]+#{Regex.escape(allowed)}$/)
    end)
  end
end
