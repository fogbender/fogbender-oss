defmodule Fog.FileStorage.S3 do
  @behaviour Fog.FileStorage

  def upload(file_binary, content_type, file_ext) do
    s3_file_path = file_path(file_ext)
    s3_bucket = Fog.env(:s3_file_upload_bucket)
    s3_region = Fog.env(:s3_file_upload_region)

    case ExAws.S3.put_object(s3_bucket, s3_file_path, file_binary,
           content_type: content_type,
           cache_control: "max-age=86400000",
           timeout: 300_000
         )
         |> ExAws.request(region: s3_region) do
      {:ok, _} ->
        {:ok, s3_file_path}

      {:error, error} ->
        {:error, error}
    end
  end

  def file_url(file_path, expires_in_sec) do
    s3_bucket = Fog.env(:s3_file_upload_bucket)
    s3_region = Fog.env(:s3_file_upload_region)
    config = ExAws.Config.new(:s3, region: s3_region)

    {:ok, url} =
      ExAws.S3.presigned_url(config, :get, s3_bucket, file_path, expires_in: expires_in_sec)

    url
  end

  def download_url(file_path, file_name, expires_in_sec) do
    s3_bucket = Fog.env(:s3_file_upload_bucket)
    s3_region = Fog.env(:s3_file_upload_region)
    config = ExAws.Config.new(:s3, region: s3_region)

    # TODO: properly escape file_name
    query_params = [{"response-content-disposition", "attachment; filename=\"#{file_name}\""}]

    {:ok, url} =
      ExAws.S3.presigned_url(config, :get, s3_bucket, file_path,
        expires_in: expires_in_sec,
        query_params: query_params
      )

    url
  end

  def read(file_path) do
    s3_bucket = Fog.env(:s3_file_upload_bucket)
    s3_region = Fog.env(:s3_file_upload_region)

    case ExAws.S3.get_object(s3_bucket, file_path, timeout: 300_000)
         |> ExAws.request(region: s3_region) do
      {:ok,
       %{
         status_code: 200,
         body: body
       }} ->
        {:ok, body}

      {:error, error} ->
        {:error, error}
    end
  end

  defp file_path(file_ext) do
    {:ok, key1} = Salty.Random.buf(3)
    {:ok, key2} = Salty.Random.buf(18)

    # file_ext has `.` already
    "#{Base.url_encode64(key1)}/#{Base.url_encode64(key2)}-content#{file_ext}"
  end
end
