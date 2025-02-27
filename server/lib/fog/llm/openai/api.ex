defmodule Fog.Llm.OpenAi.Api do
  require Logger

  @base_url "https://api.openai.com/v1"

  def assistant(api_key, assistant_id) do
    res =
      client(api_key)
      |> Tesla.get("/assistants/#{assistant_id}")

    case res do
      {:ok, %Tesla.Env{body: body, status: 200}} ->
        body

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def assistants(api_key) do
    res =
      client(api_key)
      |> Tesla.get("/assistants",
        query: [
          limit: 100
        ]
      )

    case res do
      {:ok, %Tesla.Env{body: body, status: 200}} ->
        body

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def create_assistant(api_key, version) do
    res =
      client(api_key)
      |> Tesla.post("/assistants", %{
        model: "gpt-4o",
        name: "Support Assistant",
        instructions:
          "You are a helpful assistant in a group conversation. Respond to user messages by considering the entire context of the conversation in the thread, and maintain a consistent and coherent flow.",
        response_format: "auto",
        metadata: %{
          "fogbender-version" => version
        },
        tools: [
          %{
            type: "function",
            function: %{
              name: "submit_assistant_response",
              description:
                "Generate an appropriate response for a group chat with an assistant and calculate the importance of the assistant's response.",
              strict: false,
              parameters: %{
                type: "object",
                properties: %{
                  assistant_response_relevance: %{
                    type: "integer",
                    description:
                      "An integer between 0 and 9 indicating the relevance and necessity of the assistant's response in the context of the group conversation:\\n\\n0: The assistant's reply is not needed at all (e.g., the conversation is clearly between two humans without any direct or indirect relevance to the assistant).\\n9: The assistant's reply is crucial (e.g., someone directly addresses the assistant by name or role, like 'assistant' or 'bot'), or in case someone provides dangerously incorrect answer to a question.\\n1–4: Low relevance; the assistant should refrain from responding unless explicitly requested or if the addressed participant does not respond for a significant time. For example, if the question is directed to another participant (e.g., 'Hey Alice, what’s the third planet?'), the assistant’s relevance is very low.\\n5–8: Moderate to high relevance; the assistant’s response adds value by providing critical clarification, resolving ambiguity, or contributing to the conversation in a meaningful and non-disruptive way. The relevance should be high only if it was indirectly implied or if its input directly improves the conversation.",
                    minimum: 0,
                    maximum: 9
                  },
                  response: %{
                    type: "string",
                    description: "Assistant's response"
                  }
                },
                required: [
                  "assistant_response_relevance",
                  "response"
                ]
              }
            }
          }
        ]
      })

    case res do
      {:ok, %Tesla.Env{body: assistant, status: 200}} ->
        {:ok, assistant}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def create_thread(api_key, metadata) do
    res =
      client(api_key)
      |> Tesla.post("/threads", %{
        metadata: metadata
      })

    case res do
      {:ok, %Tesla.Env{body: %{"id" => thread_id}, status: 200}} ->
        {:ok, thread_id}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def delete_thread(api_key, thread_id) do
    res =
      client(api_key)
      |> Tesla.delete("/threads/#{thread_id}")

    case res do
      {:ok, %Tesla.Env{body: %{"id" => thread_id}, status: 200}} ->
        {:ok, thread_id}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def create_message(api_key, thread_id, role, content, metadata) do
    res =
      client(api_key)
      |> Tesla.post("/threads/#{thread_id}/messages", %{
        role: role,
        content: content,
        metadata: metadata
      })

    case res do
      {:ok, %Tesla.Env{body: message, status: 200}} ->
        {:ok, message}

      {:ok,
       %Tesla.Env{
         body: %{"error" => %{"message" => "Can't add messages to thread_" <> _}},
         status: 400
       }} ->
        {:error, :busy}

      {:ok,
       %Tesla.Env{
         body: %{"error" => %{"message" => message}},
         status: 400
       } = error} ->
        if String.contains?(message, "already has an active run") do
          {:error, :busy}
        else
          {:error, error}
        end

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def test() do
    api_key = "sk-proj-R5kOx5GqBQmh4BwrGqQKT3BlbkFJmLUVtTTZ3Uq67xk5Pgf4"
    thread_id = "thread_VxqwhWZEdiEOlPxqcebmQZJq"
    assistant_id = "asst_qQGY3hT9zsTlU9WHZOMgi6ZB"

    middleware = [
      {Tesla.Middleware.Headers,
       [
         {
           "OpenAI-Beta",
           "assistants=v2"
         }
       ]},
      {Tesla.Middleware.BaseUrl, "https://api.openai.com/v1"},
      {Tesla.Middleware.BearerAuth, token: api_key},
      {Tesla.Middleware.JSON, decode_content_types: ["text/event-stream"]},
      {Tesla.Middleware.SSE, only: :data}
    ]

    client = Tesla.client(middleware, {Tesla.Adapter.Finch, name: FogFinch})

    {:ok, env} =
      Tesla.post(
        client,
        "/threads/#{thread_id}/runs",
        %{
          assistant_id: assistant_id,
          stream: true,
          tool_choice: %{
            type: "function",
            function: %{
              name: "submit_assistant_response"
            }
          }
        },
        opts: [adapter: [response: :stream]]
      )

    env.body
    |> Enum.each(fn chunk -> IO.inspect(chunk, label: "Streamed Chunk") end)
  end

  def create_run(api_key, thread_id, assistant_id) do
    {:ok, env} =
      streaming_client(api_key)
      |> Tesla.post(
        "/threads/#{thread_id}/runs",
        %{
          assistant_id: assistant_id,
          stream: true,
          tool_choice: %{
            type: "function",
            function: %{
              name: "submit_assistant_response"
            }
          }
        },
        opts: [adapter: [response: :stream]]
      )

    env.body
    |> Enum.map(fn
      %{"error" => %{"message" => message} = error} ->
        if String.contains?(message, "already has an active run") do
          {:error, :busy}
        else
          {:error, error}
        end

      %{"object" => "thread.run", "status" => "requires_action"} = run ->
        {:ok, run}

      %{"object" => "thread.run.step.delta"} = delta ->
        %{
          "delta" => %{
            "step_details" => %{
              "tool_calls" => [
                %{
                  "function" => %{"arguments" => arg},
                  "index" => 0,
                  "type" => "function"
                }
              ],
              "type" => "tool_calls"
            }
          }
        } = delta

        IO.inspect(arg)

        :skip

      _ ->
        :skip
    end)
    |> Enum.reject(&(&1 === :skip))
    |> Enum.at(0)
  end

  def create_streaming_run(api_key, thread_id, assistant_id, on_result) do
    {:ok, env} =
      streaming_client(api_key)
      |> Tesla.post(
        "/threads/#{thread_id}/runs",
        %{
          assistant_id: assistant_id,
          stream: true,
          tool_choice: %{
            type: "function",
            function: %{
              name: "submit_assistant_response"
            }
          }
        },
        opts: [adapter: [response: :stream]]
      )

    env.body
    |> Enum.each(fn
      %{"error" => %{"message" => message} = error} ->
        Logger.error(message)

        if String.contains?(message, "already has an active run") do
          on_result.({:error, :busy})
        else
          on_result.({:error, error})
        end

      %{"object" => "thread.run", "status" => "requires_action"} = run ->
        on_result.({:ok, run})

      %{"object" => "thread.run", "status" => "cancelled"} = run ->
        on_result.({:cancelled, run})

      %{"object" => "thread.run", "status" => status} = run
      when status in ["queued", "in_progress"] ->
        on_result.({:pending, run})

      %{"object" => "thread.run.step.delta"} = delta ->
        %{
          "delta" => %{
            "step_details" => %{
              "tool_calls" => [
                %{
                  "function" => %{"arguments" => arg},
                  "index" => 0,
                  "type" => "function"
                }
              ],
              "type" => "tool_calls"
            }
          }
        } = delta

        on_result.({:stream_delta, arg})

      _ ->
        :skip
    end)
  end

  def retrieve_run(api_key, thread_id, run_id) do
    res =
      client(api_key)
      |> Tesla.get("/threads/#{thread_id}/runs/#{run_id}")

    case res do
      {:ok, %Tesla.Env{body: run, status: 200}} ->
        {:ok, run}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def cancel_run(api_key, thread_id, run_id) do
    res =
      client(api_key)
      |> Tesla.post("/threads/#{thread_id}/runs/#{run_id}/cancel", %{})

    case res do
      {:ok, %Tesla.Env{body: run, status: 200}} ->
        {:ok, run}

      {:ok,
       %Tesla.Env{
         body: %{"error" => %{"message" => "Cannot cancel run with status" <> _}},
         status: 400
       }} ->
        {:ok, :ok}

      error ->
        {:error, error}
    end
  end

  def list_runs(api_key, thread_id) do
    res =
      client(api_key)
      |> Tesla.get("/threads/#{thread_id}/runs")

    case res do
      {:ok, %Tesla.Env{body: %{"data" => runs}, status: 200}} ->
        {:ok, runs}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def list_messages(api_key, thread_id) do
    res =
      client(api_key)
      |> Tesla.get("/threads/#{thread_id}/messages",
        query: [
          order: "desc",
          limit: 20
        ]
      )

    case res do
      {:ok, %Tesla.Env{body: %{"data" => data}, status: 200}} ->
        {:ok, data |> Enum.reverse()}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def list_run_messages(api_key, thread_id, run_id) do
    res =
      client(api_key)
      |> Tesla.get("/threads/#{thread_id}/messages",
        query: [
          run_id: run_id
        ]
      )

    case res do
      {:ok, %Tesla.Env{body: res, status: 200}} ->
        {:ok, res}

      {:ok, error} ->
        {:error, error}

      error ->
        {:error, error}
    end
  end

  def upload_file(api_key, binary, filename, purpose \\ "assistants") do
    mp =
      Tesla.Multipart.new()
      |> Tesla.Multipart.add_file_content(
        binary,
        filename,
        headers: [{"Content-Type", "application/octet-stream"}]
      )
      |> Tesla.Multipart.add_field("purpose", purpose)

    r =
      client(api_key)
      |> Tesla.post("/files", mp)

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"id" => file_id}}} ->
        {:ok, file_id}
    end
  end

  defp streaming_client(api_key) do
    middleware = [
      {Tesla.Middleware.Headers,
       [
         {
           "OpenAI-Beta",
           "assistants=v2"
         }
       ]},
      {Tesla.Middleware.BaseUrl, @base_url},
      {Tesla.Middleware.BearerAuth, token: api_key},
      {Tesla.Middleware.JSON, decode_content_types: ["text/event-stream"]},
      {Tesla.Middleware.SSE, only: :data}
    ]

    Tesla.client(middleware, {Tesla.Adapter.Finch, name: FogFinch})
  end

  defp client(api_key, headers \\ [], middlewares \\ [], adapter \\ nil)

  defp client(api_key, [], [], nil) do
    client(api_key, [], [Tesla.Middleware.JSON], Tesla.Adapter.Hackney)
  end

  defp client(api_key, headers, middlewares, adapter) do
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
             "OpenAI-Beta",
             "assistants=v2"
           }
         ]}

    middleware =
      middlewares ++
        [
          {Tesla.Middleware.BearerAuth, token: api_key},
          {Tesla.Middleware.BaseUrl, @base_url},
          headers,
          retry
        ]

    Tesla.client(middleware, adapter)
  end
end
