defmodule Fog.Service.UserAuthTask do
  require Logger

  use Tesla

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(params) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [params])

    :ok
  end

  def run(user_id: user_id, headers: headers),
    do: run(user_id: user_id, headers: headers, visit_url: Map.get(headers, "origin"))

  def run(user_id: _, headers: %{} = headers, visit_url: _) when map_size(headers) === 0, do: :ok

  def run(user_id: user_id, headers: headers, visit_url: visit_url) do
    headers =
      headers
      |> Enum.reduce(%{}, fn
        {"x-real-ip", v}, acc ->
          acc |> Map.merge(%{ip: v})

        {"x-forwarded-for", v}, acc ->
          acc |> Map.merge(%{for: v})

        {"x-forwarded-host", v}, acc ->
          acc |> Map.merge(%{host: v})

        {"user-agent", v}, acc ->
          acc |> Map.merge(%{userAgent: v})

        {"origin", v}, acc ->
          acc |> Map.merge(%{origin: v})

        _, acc ->
          acc
      end)

    headers =
      case Map.get(headers, "ip") do
        nil ->
          # localhost
          Map.merge(headers, %{ip: "75.111.56.87"})

        _ ->
          headers
      end
      |> Map.merge(%{visitUrl: visit_url})

    :ok = Fog.Repo.UserInfoCache.add(user_id, "headers", headers)
  end
end
