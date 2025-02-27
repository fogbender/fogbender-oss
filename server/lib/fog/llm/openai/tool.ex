defmodule Fog.Llm.OpenAi.Tool do
  def call(wid, url, params) do
    res =
      client(wid)
      |> Tesla.post(url, params)

    case res do
      {:ok, %Tesla.Env{body: body, status: 200}} ->
        {:ok, body}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  defp client(wid) do
    %{signature_secret: signature_secret} = Fog.Repo.Workspace.get(wid)
    hash = Base.encode16(:crypto.hash(:sha256, signature_secret), case: :lower)

    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 3,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status > 500 -> true
           {:ok, %{status: status}} when status > 400 -> true
           {:ok, _} -> false
           {:error, :timeout} -> true
           {:error, _} -> false
         end
       ]}

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "X-Fog-Signature-256",
           "sha256=#{hash}"
         }
       ]}

    middleware = [
      headers,
      Tesla.Middleware.JSON,
      retry
    ]

    Tesla.client(middleware)
  end
end
