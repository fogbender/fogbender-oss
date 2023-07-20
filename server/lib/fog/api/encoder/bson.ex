defmodule Fog.Api.Encoder.Bson do
  alias Fog.Api.Encoder.Common

  require Logger

  def decode(bson) do
    case Cyanide.decode(bson) do
      {:ok, map} ->
        {:ok, Common.from_map(map)}

      {:error, error} ->
        Logger.error("Encoder error: #{inspect(error)}")
        {:error, :invalid_format}
    end
  end

  def encode(struct) do
    map = Common.to_map(struct)
    Cyanide.encode!(map)
  end
end
