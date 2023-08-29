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

  def run(user_id: _, headers: %{} = headers) when map_size(headers) === 0, do: :ok

  def run(user_id: user_id, headers: headers) do
    headers =
      headers
      |> Enum.reduce(%{}, fn
        {"x-real-ip", v}, acc ->
          acc |> Map.merge(%{"ip" => v})

        {"x-forwarded-for", v}, acc ->
          acc |> Map.merge(%{"for" => v})

        {"x-forwarded-host", v}, acc ->
          acc |> Map.merge(%{"host" => v})

        {"user-agent", v}, acc ->
          acc |> Map.merge(%{"user-agent" => v})

        {"origin", v}, acc ->
          acc |> Map.merge(%{"origin" => v})

        _, acc ->
          acc
      end)

    headers =
      case Map.get(headers, "ip") do
        nil ->
          # localhost
          Map.merge(headers, %{"ip" => "75.111.56.87"})

        _ ->
          headers
      end

    :ok = Fog.Repo.UserInfoCache.add(user_id, "headers", headers)
  end
end
