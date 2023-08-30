defmodule Fog.ApiProcess do
  alias Fog.{Data, Repo, Api}

  use GenServer

  def start() do
    session = Api.Session.guest()
    start(session)
  end

  def start(%Data.User{} = u) do
    u = Repo.preload(u, [:helpdesk, :vendor])
    session = Api.Session.for_user(u.vendor.id, u.helpdesk.id, u.id)
    start(session)
  end

  def start(%Data.Agent{} = a) do
    %Data.Agent{vendors: [%Data.VendorAgentRole{vendor_id: vid}]} = Repo.preload(a, :vendors)
    session = Api.Session.for_agent(vid, a.id)
    start(session)
  end

  def start(session) do
    {:ok, pid} = GenServer.start_link(__MODULE__, session)
    Ecto.Adapters.SQL.Sandbox.allow(Repo, self(), pid)
    pid
  end

  def request(pid, request), do: GenServer.call(pid, {:request, request})
  def flush(pid), do: GenServer.call(pid, :flush)
  def session(pid), do: GenServer.call(pid, :session)
  def stop(pid), do: GenServer.stop(pid)

  # Callbacks

  @impl true
  def init(session) do
    api = Api.init(session)
    {:ok, {api, []}}
  end

  @impl true
  def handle_call({:request, request}, _from, {api, log}) do
    case Fog.Api.request(request, api) do
      {:reply, response, api} -> {:reply, response, {api, log}}
      {:ok, api} -> {:reply, :ok, {api, log}}
    end
  end

  @impl true
  def handle_call(:flush, _from, {api, log}) do
    {:reply, log, {api, []}}
  end

  @impl true
  def handle_call(:session, _from, {api, log}) do
    {:reply, api.session, {api, log}}
  end

  @impl true
  def handle_info(data, {api, log}) do
    case Fog.Api.info(data, api) do
      {:reply, response, api} -> {:noreply, {api, log ++ List.flatten([response])}}
      {:ok, api} -> {:noreply, {api, log}}
    end
  end
end
