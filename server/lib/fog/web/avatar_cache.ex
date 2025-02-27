defmodule Fog.Web.AvatarCache do
  @avatar_cache :avatar_cache

  @fallback_avatar_binary """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" shape-rendering="auto" width="512" height="512"><metadata xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><rdf:RDF><rdf:Description><dc:title>Bootstrap Icons</dc:title><dc:creator>The Bootstrap Authors</dc:creator><dc:source xsi:type="dcterms:URI">https://github.com/twbs/icons</dc:source><dcterms:license xsi:type="dcterms:URI">https://github.com/twbs/icons/blob/main/LICENSE</dcterms:license><dc:rights>„Bootstrap Icons” (https://github.com/twbs/icons) by „The Bootstrap Authors”, licensed under „MIT” (https://github.com/twbs/icons/blob/main/LICENSE)</dc:rights></rdf:Description></rdf:RDF></metadata><mask id="viewboxMask"><rect width="24" height="24" rx="0" ry="0" x="0" y="0" fill="#fff" /></mask><g mask="url(#viewboxMask)"><rect fill="#a5d6a7" width="24" height="24" x="0" y="0" /><g transform="translate(4 4)"><g fill="#fff"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0-1a8 8 0 1 1 0 16A8 8 0 0 1 8 0Z"/><path d="M4.285 6.433a.5.5 0 0 0 .683-.183A3.498 3.498 0 0 1 8 4.5c1.295 0 2.426.703 3.032 1.75a.5.5 0 0 0 .866-.5A4.499 4.499 0 0 0 5.75 4.103 4.5 4.5 0 0 0 4.102 5.75a.5.5 0 0 0 .183.683ZM7 9.5C7 8.672 6.552 8 6 8s-1 .672-1 1.5.448 1.5 1 1.5 1-.672 1-1.5Zm4 0c0-.828-.448-1.5-1-1.5s-1 .672-1 1.5.448 1.5 1 1.5 1-.672 1-1.5Z"/></g></g></g></svg>
  """

  def handle_avatar_request(avatar_url) do
    case :ets.lookup(@avatar_cache, avatar_url) do
      [{^avatar_url, avatar_data}] ->
        determine_content_type(avatar_data)

      [] ->
        case fetch_avatar(avatar_url) do
          {:ok, avatar_data} ->
            :ets.insert(@avatar_cache, {avatar_url, avatar_data})
            determine_content_type(avatar_data)

          {:error, _reason} ->
            determine_content_type(@fallback_avatar_binary)
        end
    end
  end

  defp fetch_avatar(avatar_url) do
    redirects = {Tesla.Middleware.FollowRedirects, max_redirects: 5}

    client =
      Tesla.client([
        redirects
      ])

    case Tesla.get(client, avatar_url) do
      {:ok, %Tesla.Env{status: status, body: body}} when status >= 200 and status < 300 ->
        {:ok, body}

      {:ok, %Tesla.Env{status: status}} ->
        {:error, "Unexpected status: #{status}"}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp determine_content_type(avatar_data) do
    cond do
      String.starts_with?(avatar_data, <<0x89, "PNG">>) ->
        {"image/png", avatar_data}

      String.starts_with?(avatar_data, <<0xFF, 0xD8>>) ->
        {"image/jpeg", avatar_data}

      String.starts_with?(avatar_data, <<0x47, 0x49, 0x46>>) ->
        {"image/gif", avatar_data}

      String.starts_with?(avatar_data, "<svg") ->
        {"image/svg+xml", avatar_data}

      true ->
        {"application/octet-stream", avatar_data}
    end
  end
end
