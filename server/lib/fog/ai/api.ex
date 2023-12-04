defmodule Fog.Ai.Api do
  @base_url "https://api.openai.com/v1"

  # alias Fog.{Repo}

  def models() do
    path = "/models"

    {:ok, %Tesla.Env{body: body, status: 200}} =
      client()
      |> Tesla.get(path)

    body
  end

  def completions(prompt, variants \\ 1) do
    path = "/completions"

    n =
      if variants > 3 do
        3
      else
        variants
      end

    res =
      client()
      |> Tesla.post(path, %{
        model: "gpt-3.5-turbo-instruct",
        prompt: prompt,
        max_tokens: 1500,
        temperature: 0.9,
        n: n,
        stop: "%%"
      })

    case res do
      {:ok, %Tesla.Env{body: body, status: 200}} ->
        body

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def chat_completions(messages, tracing_id, variants \\ 1) do
    path = "/chat/completions"

    n =
      if variants > 3 do
        3
      else
        variants
      end

    res =
      client()
      |> Tesla.post(path, %{
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 1500,
        temperature: 0.9,
        user: tracing_id,
        n: n
      })

    case res do
      {:ok, %Tesla.Env{body: body, status: 200}} ->
        body

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def edits(input, instruction) do
    # NOTE: not supported in text-davinci-003
    path = "/edits"

    {:ok, %Tesla.Env{body: body, status: 200}} =
      client()
      |> Tesla.post(path, %{
        model: "gpt-3.5-turbo-instruct",
        input: input,
        instruction: instruction
      })

    body
  end

  def embeddings(input, model) do
    path = "/embeddings"

    res =
      client()
      |> Tesla.post(path, %{
        model: model,
        input: input
      })

    case res do
      {:ok, %Tesla.Env{body: body, status: 200}} ->
        body

      _ ->
        res
    end
  end

  defp client(headers \\ []) do
    retry =
      {Tesla.Middleware.Retry,
       [
         delay: 1000,
         max_retries: 10,
         max_delay: 4_000,
         should_retry: fn
           {:ok, %{status: status}} when status in [400, 429, 500] -> false
           {:ok, _} -> false
           {:error, :timeout} -> true
           {:error, _} -> false
         end
       ]}

    headers =
      {Tesla.Middleware.Headers,
       headers ++
         [
           {
             "authorization",
             "Bearer " <> Fog.env(:openai_api_key)
           },
           {
             "OpenAI-Organization",
             Fog.env(:openai_organization_id)
           }
         ]}

    middleware = [
      {Tesla.Middleware.BaseUrl, @base_url},
      headers,
      Tesla.Middleware.JSON,
      retry
    ]

    Tesla.client(middleware)
  end
end
