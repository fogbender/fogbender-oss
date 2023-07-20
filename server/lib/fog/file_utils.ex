defmodule Fog.FileUtils do
  def content_type(binary) do
    case binary do
      # jpg
      <<0xFF, 0xD8, _, _, _, _, _, _, _::binary>> ->
        "image/jpeg"

      # png
      <<0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, _::binary>> ->
        "image/png"

      # gif standard
      <<0x47, 0x49, 0x46, 0x38, 0x37, 0x61, _, _, _::binary>> ->
        "image/gif"

      # gif animated
      <<0x47, 0x49, 0x46, 0x38, 0x39, 0x61, _, _, _::binary>> ->
        "image/gif"

      _ ->
        "application/octet-stream"
    end
  end

  def extension(binary) do
    case binary do
      # jpg
      <<0xFF, 0xD8, _, _, _, _, _, _, _::binary>> ->
        ".jpeg"

      # png
      <<0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, _::binary>> ->
        ".png"

      # gif standard
      <<0x47, 0x49, 0x46, 0x38, 0x37, 0x61, _, _, _::binary>> ->
        ".gif"

      # gif animated
      <<0x47, 0x49, 0x46, 0x38, 0x39, 0x61, _, _, _::binary>> ->
        ".gif"

      _ ->
        ""
    end
  end
end
