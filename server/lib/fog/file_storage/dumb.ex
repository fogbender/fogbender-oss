defmodule Fog.FileStorage.Dumb do
  @behaviour Fog.FileStorage
  require Logger

  def upload(_file_binary, _content_type, _file_ext) do
    {:ok, "file"}
  end

  def file_url(_file_path, _expires_in_sec) do
    "https://example.com/file"
  end

  def download_url(_file_path, _file_name, _expires_in_sec) do
    "https://example.com/file"
  end

  def read(_file_path) do
    {:ok, "content"}
  end
end
