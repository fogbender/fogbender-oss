defmodule Fog.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  def start(_type, _args) do
    children =
      [
        # Starts a worker by calling: Fog.Worker.start_link(arg)
        # {Fog.Worker, arg}
        ExMarcel.TableWrapper,
        Fog.Repo,
        Fog.Limiter,
        {Task.Supervisor, name: Fog.TaskSupervisor},
        Fog.Notify.EmailDigestTask.child_spec(),
        Fog.Comms.Slack.Agent.MessageTask.child_spec(),
        Fog.Comms.Slack.Customer.MessageTask.child_spec(),
        Fog.Comms.MsTeams.MessageTask.child_spec(),
        Fog.Merge.EventTask.child_spec(),
        Fog.Ai.EventTask.child_spec(),
        Fog.Ai.FetcherTask.child_spec(),
        Fog.Service.UserAuthTask.child_spec(),
        Fog.Integration.PagerDutyOncallSyncEventTask.child_spec()
      ] ++
        optional(
          Fog.env(:msteams_renew_job_enable),
          {Task, &Fog.Comms.MsTeams.RenewSubscriptionsJob.run/0}
        ) ++
        optional(Fog.env(:cognito_enable), Fog.CognitoJwks.child_spec()) ++
        optional(Fog.env(:web_api_enable), cowboy()) ++
        optional(Fog.env(:scheduler_enable), Fog.Scheduler) ++
        optional(Fog.env(:notify_badge_enable), Fog.Notify.Badge.child_spec())

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Fog.Supervisor]
    res = Supervisor.start_link(children, opts)

    :msteams_token_cache = :ets.new(:msteams_token_cache, [:public, :named_table])

    IO.puts("Fog service started with configuration:")
    IO.puts(Fog.info())
    res
  end

  defp cowboy do
    {Plug.Cowboy,
     scheme: :http,
     plug: Fog.Cowboy,
     options: [dispatch: dispatch(), port: Fog.env(:fog_port), ip: Fog.env(:fog_ip)]}
  end

  defp dispatch do
    [
      {:_,
       [
         {"/api/ws/v2", Fog.Api.Transport.Ws, []},
         {:_, Plug.Cowboy.Handler, {Fog.Cowboy, []}}
       ]}
    ]
  end

  defp optional(false, _), do: []
  defp optional(true, v), do: [v]
end
