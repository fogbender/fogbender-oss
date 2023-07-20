defmodule Fog.ScrapingBee.Api do
  @base_url "https://app.scrapingbee.com/api/v1/?api_key=#{Fog.env(:scraping_bee_api_key)}&json_response=true&url="

  def get(url) do
    {:ok, %Tesla.Env{body: _body}} =
      client()
      |> Tesla.get(@base_url <> url, opts: [adapter: [recv_timeout: 140_000]])
  end

  defp client(_headers \\ []) do
    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 0,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> false
           {:ok, _} -> false
           {:error, :timeout} -> false
           {:error, _} -> false
         end
       ]}

    middleware = [
      retry
    ]

    Tesla.client(middleware)
  end
end
