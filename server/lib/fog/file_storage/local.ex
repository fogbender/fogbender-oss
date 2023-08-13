defmodule Fog.FileStorage.Local do
  @behaviour Fog.FileStorage
  require Logger

  def upload(file_binary, _content_type, file_ext) do
    file_path = get_file_path(file_ext)
    full_path = Path.join(get_file_dir(), file_path)

    case File.write(full_path, file_binary) do
      :ok -> {:ok, file_path}
      {:error, error} -> {:error, format_file_error(error)}
    end
  end

  def file_url(file_path, expires_in_sec) do
    file_token = get_token(file_path, expires_in_sec)

    "#{Fog.env(:fog_api_url)}/files/#{file_path}/?#{URI.encode_query(%{token: file_token}, :rfc3986)}"
  end

  def download_url(file_path, file_name, expires_in_sec) do
    file_token = get_token(file_path, expires_in_sec)

    "#{Fog.env(:fog_api_url)}/files/#{file_path}/?#{URI.encode_query(%{token: file_token, download: true, file_name: file_name}, :rfc3986)}"
  end

  def read(file_path) do
    full_path = Path.join(get_file_dir(), file_path)

    case File.read(full_path) do
      {:ok, file_binary} -> {:ok, file_binary}
      {:error, error} -> {:error, format_file_error(error)}
    end
  end

  def get_token(file_path, expires_in_sec) do
    Fog.Token.token(%{type: "local_file", file_path: file_path}, expires_in_sec)
  end

  def token_valid?(token, file_path) when is_binary(token) and token != "" do
    case Fog.Token.validate(token) do
      %{type: "local_file", file_path: ^file_path} ->
        true

      {:error, error} ->
        Logger.error(
          "Invalid local file token for #{file_path} #{inspect(token)}: #{inspect(error)}"
        )

        false

      _ ->
        Logger.error("Invalid local file token for #{file_path}: #{inspect(token)}")
        false
    end
  end

  def token_valid?(_, _), do: false

  defp get_file_dir(), do: Fog.env(:file_storage_local_dir)

  defp get_file_path(file_ext) do
    {:ok, key2} = Salty.Random.buf(18)
    "#{Base.url_encode64(key2)}-content#{file_ext}"
  end

  defp format_file_error(error) do
    error
    |> :file.format_error()
    |> to_string()
  end
end
