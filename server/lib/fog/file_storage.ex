defmodule Fog.FileStorage do
  alias Fog.FileStorage.{S3, Local, Dumb}

  @expires_in_sec 7 * 86400

  @type file_binary :: binary()
  @type content_type :: String.t()
  @type file_ext :: String.t()
  @type file_path :: String.t()
  @type file_name :: String.t()
  @type error :: String.t()
  @type expires_in :: number()
  @type url :: String.t()

  @callback upload(file_binary, content_type, file_ext) :: {:ok, file_path} | {:error, error}
  @callback file_url(file_path, expires_in()) :: url
  @callback download_url(file_path, file_name, expires_in()) :: url
  @callback read(file_path) :: {:ok, file_binary} | {:error, error}

  def upload(file_binary, content_type, file_ext),
    do: mod().upload(file_binary, content_type, file_ext)

  def file_url(file_path, expires_in \\ @expires_in_sec),
    do: mod().file_url(file_path, expires_in)

  def download_url(file_path, file_name, expires_in \\ @expires_in_sec),
    do: mod().download_url(file_path, file_name, expires_in)

  def read(file_path),
    do: mod().read(file_path)

  defp mod() do
    case Fog.env(:file_storage) do
      "s3" -> S3
      "local" -> Local
      "dumb" -> Dumb
    end
  end
end
