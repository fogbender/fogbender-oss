defmodule Fog.Web.OAuthRouter do
  require Logger
  use Plug.Router
  plug(:match)
  plug(:fetch_query_params)
  plug(:dispatch)

  get "/height-auth" do
    params = fetch_query_params(conn).params

    search =
      URI.encode_query(
        %{
          client_id: Fog.env(:height_client_id),
          redirect_uri: Fog.env(:height_redirect_uri),
          scope: "api",
          state: params["state"]
        },
        :rfc3986
      )

    url = URI.parse("https://height.app/oauth/authorization?#{search}")

    Fog.Web.PublicRouter.send_html_redirect(
      conn,
      url |> to_string(),
      "Height"
    )
  end

  get "/height" do
    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
    Thanks! Closing the window now.
    <script>
    window.opener.postMessage(window.location.search, "*");
    window.close();
    </script>
    """)
  end

  get "/pagerduty-auth" do
    params = fetch_query_params(conn).params

    search =
      URI.encode_query(
        %{
          client_id: Fog.env(:pagerduty_client_id),
          redirect_uri: Fog.env(:pagerduty_redirect_uri),
          response_type: "code",
          scope: "read",
          state: params["state"],
          code_challenge: params["codeChallenge"],
          code_challenge_method: "S256"
        },
        :rfc3986
      )

    url = URI.parse("https://identity.pagerduty.com/oauth/authorize?#{search}")

    Fog.Web.PublicRouter.send_html_redirect(
      conn,
      url |> to_string(),
      "PagerDuty"
    )
  end

  get "/pagerduty" do
    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
    Thanks! Closing the window now.
    <script>
    window.opener.postMessage(window.location.search, "*");
    window.close();
    </script>
    """)
  end

  get "/slack-auth" do
    params = fetch_query_params(conn).params

    search =
      URI.encode_query(
        %{
          client_id: Fog.env(:slack_client_id),
          redirect_uri: Fog.env(:slack_redirect_uri),
          # keep in sync with manifest.yml
          scope:
            "team:read,channels:history,groups:history,groups:read,groups:write,channels:manage,channels:read,channels:join,chat:write,chat:write.customize,files:read,metadata.message:read,reactions:read,reactions:write,users:read,users:read.email,files:write",
          # we have this in manifest but it doesn't seem like we need to have in oauth request
          # user_scope: "identity.basic,identity.email,identity.avatar,identity.team",
          state: params["state"]
        },
        :rfc3986
      )

    url = URI.parse("https://slack.com/oauth/v2/authorize?#{search}")

    Fog.Web.PublicRouter.send_html_redirect(
      conn,
      url |> to_string(),
      "Slack"
    )
  end

  get "/slack" do
    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
    Thanks! Closing the window now.
    <script>
    window.opener.postMessage(window.location.search, "*");
    window.close();
    </script>
    """)
  end

  get "/slack-customer-auth" do
    params = fetch_query_params(conn).params

    search =
      URI.encode_query(
        %{
          client_id: Fog.env(:slack_cust_client_id),
          redirect_uri: Fog.env(:slack_cust_redirect_uri),
          # keep in sync with manifest.yml
          scope:
            "team:read,channels:history,channels:manage,channels:read,chat:write,chat:write.customize,files:read,groups:read,groups:write,groups:history,metadata.message:read,reactions:read,reactions:write,users:read,users:read.email,files:write",
          # we have this in manifest but it doesn't seem like we need to have in oauth request
          # user_scope: "identity.basic,identity.email,identity.avatar,identity.team",
          state: params["state"]
        },
        :rfc3986
      )

    url = URI.parse("https://slack.com/oauth/v2/authorize?#{search}")

    Fog.Web.PublicRouter.send_html_redirect(
      conn,
      url |> to_string(),
      "Slack (Customer)"
    )
  end

  get "/slack-customer" do
    params = fetch_query_params(conn).params

    case {params["state"], params["code"]} do
      {nil, _} ->
        "Slack (Customer) - Error"

      {_, nil} ->
        "Slack (Customer) - Error"

      {connect_code, slack_code} ->
        case Fog.Comms.Slack.Customer.initialize(connect_code, slack_code) do
          {:ok, channel_name} ->
            conn
            |> put_resp_content_type("text/html")
            |> send_resp(200, """
              <form action="/oauth/create-slack-channel" method="post">
                <fieldset>
                  <legend>Channel type:</legend>

                  <div>
                    <input type="radio" id="public" name="channel-type" value="public" checked>
                    <label for="public">Public</label>
                  </div>

                  <div>
                    <input type="radio" id="private" name="channel-type" value="private">
                    <label for="private">Private</label>
                  </div>


                  <label for="name">Channel name</label>
                  <input type="text" id="channel-name" name="channel-name" readonly value="#{channel_name}" />

                  <input type="hidden" id="connect-code" name="connect-code" value=#{connect_code} />

                  <button onClick="" type="submit">Create channel</button>
                </fieldset>
              </form>
            """)

          {:error, response} ->
            conn
            |> put_resp_content_type("text/html")
            |> send_resp(200, response)
        end
    end
  end

  post "/create-slack-channel" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    data = data |> URI.decode_query()
    connect_code = data["connect-code"]

    {status, response, conn} =
      case connect_code do
        nil ->
          {:error, "Slack (Customer) - Error CSC00", conn}

        connect_code ->
          case Fog.Comms.Slack.Customer.get_helpdesk_id(connect_code) do
            nil ->
              {:error, "Slack (Customer) - Error CSC01", conn}

            helpdesk_id ->
              :ok = Fog.Repo.ConnectCode.delete(connect_code)

              channel_name = data["channel-name"]
              channel_type = data["channel-type"]

              try do
                :ok =
                  Fog.Comms.Slack.Customer.set_channel(helpdesk_id, channel_name, channel_type)

                {:ok, "OK", conn}
              rescue
                e ->
                  Logger.error(Exception.format(:error, e, __STACKTRACE__))
                  {:error, "Slack (Customer) - Error CSC02", conn}
              end
          end
      end

    case status do
      :error ->
        conn
        |> put_resp_content_type("text/html")
        |> send_resp(200, response)

      :ok ->
        conn
        |> put_resp_content_type("text/html")
        |> send_resp(200, """
          Connected! It's safe to close this tab now.
          <script>
            window.close();
          </script>
        """)
    end
  end

  get "/create-slack-channel" do
    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
      Connected! It's safe to close this tab now.
      <script>
        window.close();
      </script>
    """)
  end
end
