defmodule Fog.Ai do
  @behaviour Fog.Integration.Behaviour

  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Ai, Data, Repo}

  def token(%Data.WorkspaceIntegration{} = _i) do
    raise "Not implemented"
  end

  def name(_) do
    "ai"
  end

  def url(_) do
    "https://fogbender.com"
  end

  def integration_tag_name(%Data.WorkspaceIntegration{} = i) do
    ":ai:#{i.project_id}"
  end

  def commands(%Data.WorkspaceIntegration{} = i) do
    case i.specifics["prompts"] |> Enum.map(& &1["command"]) do
      [] ->
        nil

      commands ->
        commands
    end
  end

  def ask_ai(prompt, variants \\ 1) do
    prompt = "#{prompt}" |> String.replace("\n", "\r")

    task =
      Task.async(fn ->
        Ai.Api.completions(prompt, variants)
      end)

    yield = fn yield ->
      case Task.yield(task, 5_000) do
        {:ok, result} ->
          result

        nil ->
          Logger.info("yielding...")
          yield.(yield)

        {:exit, reason} ->
          {:error, reason}
      end
    end

    res = yield.(yield)

    case res do
      {:error, _} = error ->
        error

      %{"choices" => [%{"text" => ""} | _]} ->
        :empty_response

      %{"choices" => [%{"text" => response} | _]} when variants === 1 ->
        case response |> String.trim() do
          "" ->
            :empty_response

          trimmed ->
            {:response, trimmed}
        end

      %{"choices" => choices} ->
        choices
        |> Enum.map(fn %{"text" => response} ->
          response |> String.trim()
        end)
    end
  end

  def ask_chat_ai(messages, tracing_id, variants \\ 1) do
    task =
      Task.async(fn ->
        Ai.Api.chat_completions(messages, tracing_id, variants)
      end)

    yield = fn yield ->
      case Task.yield(task, 5_000) do
        {:ok, result} ->
          result

        nil ->
          Logger.info("yielding...")
          yield.(yield)

        {:exit, reason} ->
          {:error, reason}
      end
    end

    res = yield.(yield)

    case res do
      {:error, _} = error ->
        error

      %{"choices" => choices} ->
        responses =
          choices
          |> Enum.map(fn %{"message" => message} ->
            %{message | "content" => message["content"] |> String.trim()}
          end)
          |> Enum.reject(fn %{"content" => content} -> content == "" end)

        case responses do
          [] ->
            :empty_response

          [response] when variants === 1 ->
            {:response, response}

          _ ->
            responses
        end
    end
  end

  def integration(workspace_id) do
    integrations =
      from(
        i in Data.WorkspaceIntegration,
        where: i.type == "ai",
        where: i.workspace_id == ^workspace_id
      )
      |> Repo.all()

    case integrations do
      [] -> nil
      [integration] -> integration
    end
  end

  def add_prompt_to_cluster(cluster_id, prompt, source_id) do
    {embedding, prompt_id} = get_embedding_prompt(prompt)

    {status, embedding} =
      case embedding do
        nil -> {"fetching", nil}
        %Data.EmbeddingsCache{embedding: vector} -> {"ready", vector}
      end

    Data.PromptCluster.new(%{
      id: prompt_id,
      cluster_id: cluster_id,
      source_id: source_id,
      data: %{},
      prompt: prompt,
      status: status,
      embedding: embedding
    })
    |> Repo.insert!(
      on_conflict: {:replace, [:embedding, :status]},
      conflict_target: [:id, :cluster_id]
    )

    Data.PromptCluster |> Repo.get_by(id: prompt_id, cluster_id: cluster_id)
  end

  # https://github.com/openai/openai-cookbook/blob/main/examples/Semantic_text_search_using_embeddings.ipynb
  def find_similar(cluster_id, prompt) do
    {:ok, embedding} = get_embedding_prompt_with_cache(prompt)

    res =
      from(
        p in Data.PromptCluster,
        where: p.cluster_id == ^cluster_id and p.status == "ready" and not is_nil(p.embedding)
      )
      |> Repo.all()

    res
    |> Enum.map(fn result ->
      %{
        similarity: CosineSimilarity.cosine_similarity(result.embedding, embedding),
        prompt: result,
        source_id: result.source_id
      }
    end)
    |> Enum.sort(&(&1.similarity > &2.similarity))
  end

  def debug_token_cost(text) do
    {:ok, %{body: body}} = Tesla.post("https://great-hedgehog-27.deno.dev", text)
    body |> Jason.decode!() |> Map.get("bpe") |> Enum.count()
  end

  def get_embedding_prompt(prompt) do
    prompt_id = :crypto.hash(:md5, prompt)
    {Data.EmbeddingsCache |> Repo.get(prompt_id), prompt_id}
  end

  def get_embedding_prompt_with_cache(prompt) do
    model = "text-embedding-ada-002"

    case get_embedding_prompt(prompt) do
      {nil, prompt_id} ->
        case Fog.Ai.Api.embeddings(prompt, model) do
          %{"data" => [%{"embedding" => embedding}], "usage" => %{"total_tokens" => tokens}} ->
            Data.EmbeddingsCache.new(%{
              prompt_id: prompt_id,
              prompt: prompt,
              embedding: embedding,
              model: model,
              tokens: tokens
            })
            |> Repo.insert!(
              on_conflict: :nothing,
              conflict_target: [:prompt_id]
            )

            {:ok, embedding}

          error ->
            error
        end

      {%Data.EmbeddingsCache{model: ^model, embedding: embedding}, _} ->
        # todo: for LRU style cache we should update the timestamp here
        {:ok, embedding}
    end
  end
end

defmodule CosineSimilarity do
  def cosine_similarity(v1, v2) do
    dot_product = dot_product(v1, v2)

    magnitude_v1 = :math.sqrt(Enum.reduce(v1, 0, fn x, acc -> acc + x * x end))
    magnitude_v2 = :math.sqrt(Enum.reduce(v2, 0, fn x, acc -> acc + x * x end))
    dot_product / (magnitude_v1 * magnitude_v2)
  end

  defp dot_product(a, b), do: dot_product(a, b, 0)

  defp dot_product([ah | at] = _a, [bh | bt] = _b, acc), do: dot_product(at, bt, ah * bh + acc)
  defp dot_product([], [], acc), do: acc
end
