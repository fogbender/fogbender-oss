defmodule Fog.Apollo.Api do
  require Logger

  @api_url "https://api.apollo.io/v1"

  def match(email) do
    api_key = Fog.env(:apollo_api_key)

    case Fog.Repo.EmailInfoCache.get(email, "apollo") do
      nil ->
        match(email, api_key)

      %Fog.Data.EmailInfoCache{info: info, updated_at: updated_at} ->
        age_days = DateTime.diff(DateTime.utc_now(), updated_at, :day)

        if age_days > 45 do
          match(email, api_key)
        else
          {:ok, info}
        end
    end
  end

  defp match(_, nil) do
    {:error, :no_api_key}
  end

  defp match(email, _) do
    r =
      client()
      |> Tesla.get("/people/match",
        query: [
          email: email,
          reveal_personal_email: true
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        :ok = Fog.Repo.EmailInfoCache.add(email, "apollo", body)
        match(email)

      e ->
        Logger.error(
          "Apollo error: #{inspect(e)}, Stacktrace: #{inspect(Process.info(self(), :current_stacktrace))}"
        )

        {:error, e}
    end
  end

  defp client() do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query
    api_key = Fog.env(:apollo_api_key)

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         },
         {
           "X-Api-Key",
           api_key
         }
       ]}

    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end
end
