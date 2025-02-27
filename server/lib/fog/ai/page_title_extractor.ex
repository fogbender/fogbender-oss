defmodule Fog.Ai.PageTitleExtractor do
  require Logger

  use Tesla
  plug(Tesla.Middleware.FollowRedirects, max_redirects: 5)

  plug(Tesla.Middleware.Headers, [
    {"user-agent",
     "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"}
  ])

  plug(Tesla.Middleware.Timeout, timeout: 5_000)
  plug(Tesla.Middleware.Compression, format: "gzip")

  def extract("https://" <> _ = domain) do
    case get(domain) do
      {:ok, %{body: body, status: 200}} ->
        description = Fog.Ai.FetcherTask.description(body)

        case Fog.Ai.ask_ai("""
             Given the following content, can you extract the name of the company? If you can't, just make up a random name. Respond with name only - do not include the words 'company name' or 'name' followed by colon, or quotations marks of any kind. Do not explain your reasoning, just respond with a name.

             Content: ###
             #{description}
             ###
             """) do
          {:response, response} ->
            {:ok, response}

          e ->
            Logger.error("Error: #{inspect(e)} #{Exception.format_stacktrace()}")
            :no_luck
        end

      _ ->
        :no_luck
    end
  end

  def extract(domain) do
    extract("https://#{domain}")
  end
end
