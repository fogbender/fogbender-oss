defmodule Fog.Api.Encoder.Json do
  alias Fog.Api.Encoder.Common
  require Logger

  def decode(json) do
    case Jason.decode(json) do
      {:ok, map} ->
        {:ok, Common.from_map(map)}

      {:error, error} ->
        Logger.error("Encoder error: #{inspect(error)}")
        {:error, :invalid_format}
    end
  end

  def encode(data) when is_struct(data) or is_list(data) do
    map = Common.to_map(data)
    Jason.encode!(map)
  end
end
