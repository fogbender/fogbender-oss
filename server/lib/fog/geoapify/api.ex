defmodule Fog.Geoapify.Api do
  @api_url "https://api.geoapify.com/v1/ipinfo"

  def locate(ip) do
    api_key = Fog.env(:geoapify_api_key)
    locate(ip, api_key)
  end

  def locate(_, nil) do
    Fog.Geoapify.Fictional.place()
  end

  def locate(ip, api_key) do
    r =
      client()
      |> Tesla.get("/",
        query: [
          apiKey: api_key,
          ip: ip
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      _ ->
        Fog.Geoapify.Fictional.place()
    end
  end

  def city(ip) do
    case locate(ip) do
      {:ok, %{"city" => %{"name" => city}}} ->
        {:ok, city}

      {:ok, city} ->
        {:ok, city}
    end
  end

  defp client() do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end
end
