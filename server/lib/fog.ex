defmodule Fog do
  @moduledoc """
  Documentation for Fog.
  """

  @doc """
  Hello world.

  """
  def env(key) do
    Application.get_env(:fog, key)
  end

  def info() do
    [
      current_directory: File.cwd!(),
      fog_api_url: env(:fog_api_url),
      fog_client_url: env(:fog_client_url),
      fog_storefront_url: env(:fog_storefront_url),
      fog_ip: env(:fog_ip),
      fog_port: env(:fog_port),
      db_name: env(Fog.Repo)[:database],
      db_host: env(Fog.Repo)[:hostname],
      db_port: env(Fog.Repo)[:port]
    ]
    |> info_pp()
  end

  defp info_pp(info) do
    for {n, v} <- info do
      [inspect(n), "\t ", inspect(v)]
    end
    |> Enum.join("\n")
  end
end
