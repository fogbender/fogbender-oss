defmodule Fog.Repo.LlmThreadRoomMapping do
  import Ecto.Query

  alias Fog.{Data, Llm, Repo}

  def create(params) do
    Data.LlmThreadRoomMapping.new(params)
    |> Repo.insert!()
  end

  def get_or_create_thread_id(room_id, llmi) do
    %Data.WorkspaceLlmIntegration{
      provider: provider = "OpenAI",
      api_key: api_key
    } = llmi

    case thread_id(room_id, provider) do
      nil ->
        {:ok, thread_id} = Llm.OpenAi.Api.create_thread(api_key, %{"room_id" => room_id})

        %Data.LlmThreadRoomMapping{} =
          Repo.LlmThreadRoomMapping.create(
            thread_id: thread_id,
            room_id: room_id,
            provider: provider
          )

        thread_id

      x ->
        x
    end
  end

  def thread_id(room_id, provider) do
    from(
      m in Data.LlmThreadRoomMapping,
      where: m.room_id == ^room_id,
      where: m.provider == ^provider,
      select: m.thread_id
    )
    |> Repo.one()
  end

  def room_id(thread_id, provider) do
    from(
      m in Data.LlmThreadRoomMapping,
      where: m.thread_id == ^thread_id,
      where: m.provider == ^provider,
      select: m.room_id
    )
    |> Repo.one()
  end
end
