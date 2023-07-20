defmodule Fog.Zendesk.Client do
  def user_agent do
    "fogbender.com"
  end

  # use Tesla
  def new(opts) do
    account = opts[:account]
    username = "#{account.email}/token"
    password = "#{account.token}"
    subdomain = "#{account.subdomain}"
    basic_auth = %{username: username, password: password}
    base_url = "https://#{subdomain}.zendesk.com/api/v2/"

    Tesla.client(
      [
        {Tesla.Middleware.BaseUrl, base_url},
        {Tesla.Middleware.BasicAuth, basic_auth},
        {Tesla.Middleware.Headers, [{"User-Agent", user_agent()}]},
        {Tesla.Middleware.JSON, []}
      ] ++
        if opts[:no_compression] do
          []
        else
          [
            {Tesla.Middleware.Compression, []}
          ]
        end
    )
  end

  def put_comment(client, ticket_id: ticket_id, message_body: body) do
    Tesla.put(
      client,
      "tickets/#{ticket_id}.json",
      %{ticket: %{comment: %{body: body}}}
    )
  end

  def get_incremental_export(client, opts) do
    start_time = opts[:start_time]

    Tesla.get(
      client,
      "incremental/ticket_events.json",
      query: [start_time: start_time, include: "comment_events"],
      # this api can take a looong time as per docs
      opts: [adapter: [recv_timeout: 60_000]]
    )
  end
end
