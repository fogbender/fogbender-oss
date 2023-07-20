defmodule Fog.Ai.EmbeddingsCacheJob do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Ai, Data, Repo}

  def run() do
    Logger.info("Kicking off EmbeddingsCacheJob")
    process_sources(get_sources_page())
    process_prompts(get_prompts_page())
  end

  def process_sources([]), do: :ok

  def process_sources([%{id: id, text: nil, parent_id: parent_id} | t])
      when not is_nil(parent_id) do
    case Data.EmbeddingsSource |> Repo.get(id) do
      nil ->
        :ok

      struct ->
        try do
          struct |> Repo.delete()
        rescue
          _e in [Ecto.StaleEntryError] ->
            :ok
        end
    end

    process_sources(t)
  end

  def process_sources([
        %{id: id, text: nil, workspace_id: _workspace_id, parent_id: parent_id} | t
      ]) do
    if not is_nil(parent_id) do
      case Data.EmbeddingsSource |> Repo.get(id) do
        nil ->
          :ok

        struct ->
          try do
            struct |> Repo.delete()
          rescue
            _e in [Ecto.StaleEntryError] ->
              :ok
          end
      end
    end

    process_sources(t)
  end

  def process_sources([
        %{id: id, text: text, workspace_id: workspace_id, parent_id: parent_id} | t
      ]) do
    # max for text-embedding-ada-002 is 8191
    # 1500 is 2048 tokens
    # we can fit about 6000 words into one API call

    # max for text-davinci-003 is 4097
    # about 3000 words

    num_fragments =
      text
      |> String.replace(~r/\s+/, " ")
      |> String.split(" ")
      |> Enum.chunk_every(1000, 500)
      |> Enum.map(fn chunk ->
        case chunk |> Enum.join(" ") do
          "" ->
            0

          fragment ->
            %{source_id: source_id} =
              Ai.add_prompt_to_cluster(
                workspace_id,
                fragment,
                id
              )

            if id !== source_id do
              0
            else
              1
            end
        end
      end)
      |> List.flatten()
      |> Enum.sum()

    struct = Data.EmbeddingsSource |> Repo.get(id)

    if num_fragments === 0 and not is_nil(parent_id) do
      case struct do
        nil ->
          :ok

        struct ->
          try do
            struct |> Repo.delete()
          rescue
            _e in [Ecto.StaleEntryError] ->
              :ok
          end
      end
    else
      struct
      |> Ecto.Changeset.change(status: "ready")
      |> Repo.update()
    end

    process_sources(t)
  end

  def process_prompts([]), do: :ok

  def process_prompts([%{prompt: prompt} = h | t]) do
    case Ai.get_embedding_prompt_with_cache(prompt) do
      {:ok,
       %{
         status: 400,
         body: %{
           "error" => %{"message" => "This model's maximum context length is " <> _} = error
         }
       }} ->
        Logger.error("#{inspect(error)}")

        {:ok, _} =
          h
          |> Ecto.Changeset.change(status: "error")
          |> Repo.update()

      {:ok, embedding} when not is_nil(embedding) ->
        {:ok, _} =
          h
          |> Ecto.Changeset.change(status: "ready", embedding: embedding)
          |> Repo.update()
    end

    process_prompts(t)
  end

  def get_sources_page() do
    from(
      p in Data.EmbeddingsSource,
      where: is_nil(p.status),
      limit: 500
    )
    |> Repo.all()
  end

  def get_prompts_page() do
    from(
      p in Data.PromptCluster,
      where: p.status == "fetching",
      limit: 600
    )
    |> Repo.all()
  end
end
