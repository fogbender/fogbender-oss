defmodule Fog.Limiter do
  use GenServer
  require Logger

  @default_delay 5

  def start_link([]), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  @spec put(any(), number()) :: :ok | {:limit, number()}
  def put(key, delay \\ @default_delay), do: GenServer.call(__MODULE__, {:put, key, delay})

  # Callbacks
  def init([]) do
    {:ok, %{}}
  end

  def handle_call({:put, key, delay}, _from, state) do
    case Map.get(state, key) do
      nil ->
        state = put_key(key, delay, state)
        {:reply, :ok, state}

      %{exp: exp, delay: delay} ->
        Logger.warn("Limit for #{key}: #{delay} sec")
        diff = time_diff(exp)
        {:reply, {:limit, diff}, state}
    end
  end

  def handle_info({:timeout, key}, state) do
    state = Map.delete(state, key)
    {:noreply, state}
  end

  # Helpers
  defp put_key(key, delay, state) do
    iss = DateTime.utc_now()
    exp = DateTime.add(iss, delay, :second)
    rec = %{delay: delay, iss: iss, exp: exp}
    Process.send_after(self(), {:timeout, key}, delay * 1000)
    Map.put(state, key, rec)
  end

  defp time_diff(exp) do
    now = DateTime.utc_now()
    max(DateTime.diff(now, exp), 1)
  end
end
