defmodule Fog.Hunter.Api do
  require Logger

  @api_url "https://api.hunter.io/v2"

  def lookup(email) do
    case Fog.Repo.EmailInfoCache.get(email, "hunter") do
      nil ->
        verify(email)

      %Fog.Data.EmailInfoCache{info: info, updated_at: updated_at} ->
        age_days = DateTime.diff(DateTime.utc_now(), updated_at, :day)

        if age_days > 45 do
          verify(email)
        else
          {:ok, info}
        end
    end
  end

  defp verify(email) do
    r =
      client()
      |> Tesla.get("/email-verifier",
        query: [
          email: email
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        :ok = Fog.Repo.EmailInfoCache.add(email, "hunter", body)
        lookup(email)

      e ->
        Logger.error(
          "Hunter error: #{inspect(e)}, Stacktrace: #{inspect(Process.info(self(), :current_stacktrace))}"
        )

        {:error, e}
    end
  end

  defp client() do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query
    api_key = Fog.env(:hunter_api_key)

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         },
         {
           "X-API-KEY",
           api_key
         }
       ]}

    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end
end
