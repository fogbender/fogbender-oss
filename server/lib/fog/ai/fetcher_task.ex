defmodule Fog.Ai.FetcherTask do
  require Logger

  # alias Fog.{Ai, Api, Data, Integration, Repo, Utils}
  alias Fog.{Data, Repo}

  use Tesla

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(params) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [params])

    :ok
  end

  def run(github_issues_url: issues_url, workspace_id: workspace_id, repo: repo) do
    Data.EmbeddingsSource.new(
      url: issues_url,
      text: "",
      description: "",
      status: "ready",
      workspace_id: workspace_id,
      deleted_at: nil,
      deleted_by_agent_id: nil
    )
    |> Repo.insert!(
      on_conflict: {:replace, [:deleted_by_agent_id, :deleted_at]},
      conflict_target: [:workspace_id, :url]
    )

    token = Fog.env(:github_tokens) |> String.split(",") |> Enum.random()

    source = Repo.get_by(Data.EmbeddingsSource, url: issues_url, workspace_id: workspace_id)

    Fog.Integration.GitHub.get_issues(token, repo, fn issues ->
      issues
      |> Enum.each(fn
        %{"pull_request" => _} ->
          :ok

        %{
          "title" => title,
          "body" => issue_body,
          "number" => issue_number,
          "html_url" => issue_url
        } ->
          {:ok, comments} = Fog.Integration.GitHub.get_issue_comments(token, repo, issue_number)

          comments =
            comments
            |> Enum.map(fn %{"body" => body} ->
              body
            end)
            |> Enum.join("\n\n")

          text = "#{title}\n\n#{issue_body}\n\n#{comments}"

          Data.EmbeddingsSource.new(
            url: issue_url,
            parent_id: source.id,
            text: text,
            description: "",
            status: nil,
            workspace_id: workspace_id
          )
          |> Repo.insert!(
            on_conflict: {:replace, [:deleted_by_agent_id, :deleted_at]},
            conflict_target: [:workspace_id, :url]
          )

          Process.sleep(500)
      end)

      Process.sleep(500)
    end)
  end

  def run(
        embeddings_source:
          %Data.EmbeddingsSource{
            id: id,
            workspace_id: workspace_id,
            url: "https://victoriametrics.com/blog/index.xml" = url
          } = _s
      ) do
    {:ok, %{body: body}} = get(url)

    {doc, []} =
      body
      |> :binary.bin_to_list()
      |> :xmerl_scan.string(quiet: true)

    structs = :xmerl_xpath.string(to_charlist("//link"), doc)

    urls =
      structs
      |> Enum.map(fn struct ->
        {
          :xmlElement,
          :link,
          :link,
          _,
          _,
          _,
          _,
          _,
          [
            {:xmlText, _, _, _, url, :text}
          ],
          _,
          _,
          _
        } = struct

        url |> to_string()
      end)

    urls
    |> Enum.each(fn child_url ->
      embeddings_source =
        Repo.get_by(Data.EmbeddingsSource, url: child_url, workspace_id: workspace_id)

      case embeddings_source do
        nil ->
          Data.EmbeddingsSource.new(
            url: child_url,
            parent_id: id,
            text: "",
            description: "",
            status: "fetching",
            workspace_id: workspace_id,
            restrict_path: "https://victoriametrics.com/blog/"
          )
          |> Repo.insert!(
            on_conflict: :nothing,
            conflict_target: [:workspace_id, :url]
          )

          embeddings_source =
            Repo.get_by(Data.EmbeddingsSource, url: child_url, workspace_id: workspace_id)

          :ok = schedule(embeddings_source: embeddings_source)

        _ ->
          :ok
      end
    end)

    :ok
  end

  def run(
        embeddings_source:
          %Data.EmbeddingsSource{
            id: id,
            workspace_id: workspace_id,
            url: url,
            restrict_path: restrict_path
          } = s
      ) do
    Logger.info("Processing #{url}")

    case probe_source(url) do
      {:ok, %{status: 404}} ->
        s = s |> Ecto.Changeset.change(status: "404")

        {:ok, _} = Repo.update(s)

      {:ok, %{status: 429}} ->
        # Too many requets
        Logger.info("#{url} too many requests")
        Process.sleep(:rand.uniform(120_000))
        :ok = schedule(embeddings_source: s)

      {:ok, _body, nil, _relative_urls} ->
        :ok = delete_embeddings_source(id)

      {:error, :unsupported_content_type} ->
        :ok = delete_embeddings_source(id)

      {:ok, body, text, relative_urls} ->
        description = description(body)

        s = s |> Ecto.Changeset.change(text: text, description: description, status: nil)

        {:ok, _s} = Repo.update(s)

        relative_urls
        |> Enum.filter(fn relative_url ->
          case restrict_path do
            nil ->
              true

            path ->
              relative_url |> String.starts_with?(path)
          end
        end)
        |> Enum.each(fn relative_url ->
          parsed_url = URI.parse(url)
          parsed_relative_url = URI.parse(relative_url)

          child_url =
            URI.merge(parsed_url, parsed_relative_url)
            |> Map.put(:fragment, nil)
            |> URI.to_string()
            |> String.trim_trailing("/#")

          embeddings_source =
            Repo.get_by(Data.EmbeddingsSource, url: child_url, workspace_id: workspace_id)

          case embeddings_source do
            nil ->
              Data.EmbeddingsSource.new(
                url: child_url,
                parent_id: id,
                text: "",
                description: "",
                status: "fetching",
                workspace_id: workspace_id,
                restrict_path: restrict_path
              )
              |> Repo.insert!(
                on_conflict: :nothing,
                conflict_target: [:workspace_id, :url]
              )

              embeddings_source =
                Repo.get_by(Data.EmbeddingsSource, url: child_url, workspace_id: workspace_id)

              :ok = schedule(embeddings_source: embeddings_source)

            _ ->
              :ok
          end
        end)

      {:error, :timeout} ->
        Logger.info("#{url} timeout")
        Process.sleep(120_000)
        :ok = schedule(embeddings_source: s)

      x ->
        Logger.info("#{inspect(x)}")
        :ok
    end
  end

  plug(Tesla.Middleware.FollowRedirects, max_redirects: 5)

  plug(Tesla.Middleware.Headers, [
    {"user-agent",
     "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"}
  ])

  plug(Tesla.Middleware.Timeout, timeout: 5_000)
  plug(Tesla.Middleware.Compression, format: "gzip")

  def probe_source("https://help.bizagi.com/platform/en" <> _ = url) do
    {:ok, res} = Fog.ScrapingBee.Api.get(url)

    case res do
      %{status: 200, body: body} ->
        body = body |> Jason.decode!()
        body["body"] |> handle_body()

      e ->
        {:ok, e}
    end
  end

  def probe_source(url) do
    do_probe_source(get(url))
  end

  def do_probe_source({:ok, %{headers: headers, body: body, status: 200}}) do
    case headers |> Enum.find(fn {h, _} -> h === "content-type" end) do
      {"content-type", "text/html" <> _} ->
        body |> handle_body()

      _ ->
        {:error, :unsupported_content_type}
    end
  end

  def do_probe_source(e) do
    e
  end

  def handle_body(body) do
    {text, urls} = body |> Fog.Format.convert_with_urls(Fog.Format.Html, Fog.Format.Plain)

    relative_urls =
      urls
      |> Enum.filter(&(&1 !== []))
      |> Enum.filter(&(&1 !== "/"))
      |> Enum.filter(&(&1 !== ""))
      |> Enum.filter(fn
        [] ->
          false

        url ->
          case URI.parse(url) do
            %URI{scheme: nil, authority: nil} ->
              true

            _ ->
              false
          end
      end)

    {:ok, body, text, relative_urls}
  end

  defp meta_description(document, name, value) do
    document
    |> Floki.find("meta[#{name}='#{value}']")
    |> Floki.attribute("content")
    |> Floki.text()
  end

  defp description(body) do
    {:ok, document} = Floki.parse_document(body)

    case meta_description(document, "name", "description") do
      "" ->
        case meta_description(document, "name", "og:description") do
          "" ->
            meta_description(document, "property", "og:description")

          d ->
            d
        end

      d ->
        d
    end
  end

  def delete_embeddings_source(id) do
    case Data.EmbeddingsSource |> Repo.get(id) do
      nil ->
        :ok

      struct ->
        try do
          {:ok, _} = struct |> Repo.delete()
          :ok
        rescue
          _e in [Ecto.StaleEntryError] ->
            :ok
        end
    end
  end
end
