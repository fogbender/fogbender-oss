defmodule Fog.Llm do
  require Logger

  alias Fog.{Api, Data, Llm, Repo}

  def create_message(
        %Data.WorkspaceLlmIntegration{provider: "OpenAI"} = llmi,
        %Data.Message{} = message,
        sess
      ) do
    %{api_key: api_key} = llmi
    %{room_id: room_id, id: message_id} = message

    %Api.Event.Message{rawText: content} =
      Api.Event.Message.preload(message) |> Api.Event.Message.from_data(message)

    thread_id = Repo.LlmThreadRoomMapping.get_or_create_thread_id(room_id, llmi)
    author = Fog.Utils.get_author_with_overrides(message, sess)
    author_name = author |> Fog.Utils.author_name()
    content = "#{author_name}: #{content}"

    IO.inspect({:content, content})

    files =
      message.files
      |> Enum.map(fn file ->
        provider_file_id = Repo.LlmFileMapping.provider_file_id("openai", file.id)

        %{
          type: "image_file",
          image_file: %{
            file_id: provider_file_id
          }
        }
      end)

    content =
      case files do
        [] ->
          content

        _ ->
          [%{"type" => "text", "text" => content} | files]
      end

    Llm.OpenAi.Api.create_message(api_key, thread_id, "user", content, %{
      "message_id" => message_id
    })
  end

  def create_job(llmi, room_id) do
    %{api_key: api_key, assistant_id: assistant_id} = llmi
    thread_id = Repo.LlmThreadRoomMapping.get_or_create_thread_id(room_id, llmi)

    IO.inspect(api_key: api_key, thread_id: thread_id, assistant_id: assistant_id)

    case Llm.OpenAi.Api.create_run(api_key, thread_id, assistant_id) do
      {:ok, run} ->
        {:ok, %{llmi: llmi, run: run, status: coalesce_status(run)}}

      {:error, :busy} ->
        {:error, :busy}

      {:error, error} ->
        {:error, error}
    end
  end

  def create_run(llmi, room_id, on_result) do
    %{api_key: api_key, assistant_id: assistant_id} = llmi
    thread_id = Repo.LlmThreadRoomMapping.get_or_create_thread_id(room_id, llmi)

    IO.inspect(api_key: api_key, thread_id: thread_id, assistant_id: assistant_id)

    Llm.OpenAi.Api.create_streaming_run(api_key, thread_id, assistant_id, fn
      {:ok, run} ->
        on_result.({:ok, %{llmi: llmi, run: run, status: coalesce_status(run)}})

      {:pending, run} ->
        on_result.({:pending, %{llmi: llmi, run: run, status: coalesce_status(run)}})

      {:cancelled, run} ->
        on_result.({:cancelled, %{llmi: llmi, run: run, status: coalesce_status(run)}})

      {:error, :busy} ->
        on_result.({:error, :busy})

      {:stream_delta, _} = delta ->
        on_result.(delta)

      {:error, error} ->
        on_result.({:error, error})
    end)
  end

  def check_job(%{llmi: %Data.WorkspaceLlmIntegration{provider: "OpenAI"} = llmi, run: run} = job) do
    %{api_key: api_key} = llmi
    %{"id" => run_id, "thread_id" => thread_id} = run
    {:ok, run} = Llm.OpenAi.Api.retrieve_run(api_key, thread_id, run_id)

    res =
      case run do
        %{"status" => "completed"} ->
          {:ok, %{"data" => replies}} =
            Llm.OpenAi.Api.list_run_messages(api_key, thread_id, run_id)

          replies =
            replies |> Enum.map(&normalize_message("OpenAI", &1)) |> Enum.reject(&is_nil(&1))

          {"success", replies}

        %{
          "status" => "requires_action",
          "required_action" => %{
            "submit_tool_outputs" => %{
              "tool_calls" => [
                %{
                  "function" => %{
                    "arguments" => arguments,
                    "name" => "submit_assistant_response"
                  },
                  "type" => "function"
                }
              ]
            },
            "type" => "submit_tool_outputs"
          }
        } ->
          %{"assistant_response_relevance" => relevance, "response" => response} =
            Jason.decode!(arguments)

          {:ok, _} = cancel_job(job)

          IO.inspect({:relevance, relevance})

          if relevance > 6 do
            content = "Assistant: #{response}"

            {:ok, _} =
              Llm.OpenAi.Api.create_message(api_key, thread_id, "assistant", content, %{})

            {"success", [response]}
          else
            {"skip", []}
          end

        %{"status" => s} when s in ["queued", "in_progress"] ->
          {"pending", []}

        _error ->
          {"failed", []}
      end

    {:ok, res}
  end

  def cancel_job(%{llmi: %{provider: "OpenAI"} = llmi, run: run}) do
    %{api_key: api_key} = llmi
    %{"id" => run_id, "thread_id" => thread_id} = run

    case run do
      %{"status" => status} when status not in ["completed", "cancelled"] ->
        Logger.info(
          "Job with status #{status} cancelled for run_id #{run_id}, thread_id #{thread_id}"
        )

        {:ok, _} = Llm.OpenAi.Api.cancel_run(api_key, thread_id, run_id)

      _ ->
        {:ok, run}
    end
  end

  def list_jobs(%{provider: "OpenAI"} = llmi, room_id) do
    %{api_key: api_key} = llmi
    thread_id = Repo.LlmThreadRoomMapping.get_or_create_thread_id(room_id, llmi)
    {:ok, runs} = Llm.OpenAi.Api.list_runs(api_key, thread_id)
    {:ok, runs |> Enum.map(fn run -> %{run: run, llmi: llmi, status: coalesce_status(run)} end)}
  end

  def upload_file(
        llmi: %{provider: "OpenAI"} = llmi,
        filename: filename,
        file_body: file_body,
        file: file
      ) do
    %{api_key: api_key} = llmi
    %{id: file_id} = file

    {:ok, provider_file_id} = Llm.OpenAi.Api.upload_file(api_key, file_body, filename)

    %Data.LlmFileMapping{} =
      Repo.LlmFileMapping.create(
        provider: "openai",
        provider_file_id: provider_file_id,
        file_id: file_id
      )

    :ok
  end

  # queued, in_progress, requires_action, cancelling, cancelled, failed, completed, incomplete, or expired
  defp coalesce_status(%{"status" => "completed"}), do: "completed"

  defp coalesce_status(%{"status" => s})
       when s in ["queued", "in_progress"],
       do: "pending"

  defp coalesce_status(%{"status" => s})
       when s in ["requires_action", "incomplete"],
       do: "completed"

  defp coalesce_status(_), do: "failed"

  defp normalize_message("OpenAI", %{"role" => "assistant", "content" => content}) do
    content
    |> Enum.find_value(fn
      %{"type" => "text", "text" => %{"value" => value}} ->
        value

      _ ->
        nil
    end)
  end

  defp normalize_message("OpenAI", _), do: nil
end
