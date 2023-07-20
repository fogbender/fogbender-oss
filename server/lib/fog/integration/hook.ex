defmodule Fog.Integration.Hook do
  require Logger
  use Plug.Router
  plug(:match)
  plug(:fetch_query_params)
  plug(:dispatch)

  match "/:widget_id", via: :head do
    conn |> send_resp(200, "")
  end

  post "/slack" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)

    data = data |> Jason.decode!()
    token = Fog.env(:slack_verification_token)

    case data do
      %{
        "challenge" => challenge,
        "token" => ^token,
        "type" => "url_verification"
      } ->
        conn
        |> put_resp_content_type("text/plain")
        |> send_resp(200, challenge)

      _ ->
        :ok = Fog.Comms.Slack.Agent.Hook.consume(data)
        conn |> send_resp(204, "")
    end
  end

  post "/msteams" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)

    case get_req_header(conn, "content-type") do
      ["text/plain" <> _] ->
        params = fetch_query_params(conn).params
        token = params["validationToken"]

        conn
        |> put_resp_content_type("text/plain")
        |> send_resp(200, token)

      ["application/json" <> _] ->
        data = data |> Jason.decode!()
        :ok = Fog.Comms.MsTeams.Hook.consume(data)
        conn |> send_resp(204, "")
    end
  end

  post "/slack-customer" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)

    data = data |> Jason.decode!()
    token = Fog.env(:slack_cust_verification_token)

    case data do
      %{
        "challenge" => challenge,
        "token" => ^token,
        "type" => "url_verification"
      } ->
        conn
        |> put_resp_content_type("text/plain")
        |> send_resp(200, challenge)

      _ ->
        :ok = Fog.Comms.Slack.Customer.Hook.consume(data)
        conn |> send_resp(204, "")
    end
  end

  post "/:widget_id" do
    {_, conn} =
      with {:no_match, conn} <- check_linear(conn, widget_id),
           {:no_match, conn} <- check_asana(conn, widget_id),
           {:no_match, conn} <- check_jira(conn, widget_id),
           {:no_match, conn} <- check_github(conn, widget_id),
           {:no_match, conn} <- check_height(conn, widget_id),
           {:no_match, conn} <- check_trello(conn, widget_id) do
        {:no_match, conn}
      end

    conn |> send_resp(204, "")
  end

  post "/" do
    {_, conn} =
      with {:no_match, conn} <- check_gitlab(conn) do
        {:no_match, conn}
      end

    conn |> send_resp(204, "")
  end

  def check_linear(conn, widget_id) do
    case get_req_header(conn, "linear-event") do
      [h] when h in ["Issue", "Comment", "IssueLabel"] ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)

        data = data |> Jason.decode!()

        :ok =
          Fog.Integration.LinearHook.consume(%Fog.Integration.LinearHook{
            widget_id: widget_id,
            data: data
          })

        {:match, conn}

      _ ->
        {:no_match, conn}
    end
  end

  def check_github(conn, widget_id) do
    case get_req_header(conn, "x-github-event") do
      [h] when h in ["issue_comment", "issues"] ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)

        data = data |> Jason.decode!()

        :ok =
          Fog.Integration.GitHubHook.consume(%Fog.Integration.GitHubHook{
            widget_id: widget_id,
            data: data
          })

        {:match, conn}

      _ ->
        {:no_match, conn}
    end
  end

  def check_asana(conn, widget_id) do
    case get_req_header(conn, "x-hook-secret") do
      [secret] ->
        conn = conn |> put_resp_header("x-hook-secret", secret)

        {:match, conn}

      _ ->
        case get_req_header(conn, "x-hook-signature") do
          [signature] ->
            {:ok, data, conn} = Plug.Conn.read_body(conn)

            data = data |> Jason.decode!()

            :ok =
              Fog.Integration.AsanaHook.consume(%Fog.Integration.AsanaHook{
                widget_id: widget_id,
                signature: signature,
                data: data
              })

            {:match, conn}

          _ ->
            {:no_match, conn}
        end
    end
  end

  def check_jira(conn, widget_id) do
    case get_req_header(conn, "x-atlassian-webhook-identifier") do
      [_] ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)
        data = data |> Jason.decode!()

        :ok =
          Fog.Integration.JiraHook.consume(%Fog.Integration.JiraHook{
            widget_id: widget_id,
            data: data
          })

        {:match, conn}

      _ ->
        {:no_match, conn}
    end
  end

  def check_gitlab(conn) do
    case get_req_header(conn, "x-gitlab-event") do
      [h] when h in ["Issue Hook", "Note Hook"] ->
        case get_req_header(conn, "x-gitlab-token") do
          [widget_id] ->
            {:ok, data, conn} = Plug.Conn.read_body(conn)

            data = data |> Jason.decode!()

            :ok =
              Fog.Integration.GitLabHook.consume(%Fog.Integration.GitLabHook{
                widget_id: widget_id,
                data: data
              })

            {:match, conn}

          _ ->
            {:no_match, conn}
        end

      _ ->
        {:no_match, conn}
    end
  end

  def check_height(conn, widget_id) do
    case get_req_header(conn, "user-agent") do
      [h] when h in ["Height webhook"] ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)

        params = fetch_query_params(conn).params
        height_workspace_id = params["workspaceId"]
        data = data |> Jason.decode!()

        :ok =
          Fog.Integration.HeightHook.consume(%Fog.Integration.HeightHook{
            widget_id: widget_id,
            height_workspace_id: height_workspace_id,
            data: data
          })

        {:match, conn}

      _ ->
        {:no_match, conn}
    end
  end

  def check_trello(conn, widget_id) do
    case get_req_header(conn, "x-trello-webhook") do
      [] ->
        {:no_match, conn}

      [_] ->
        {:ok, data, conn} = Plug.Conn.read_body(conn)

        data = data |> Jason.decode!()

        :ok =
          Fog.Integration.TrelloHook.consume(%Fog.Integration.TrelloHook{
            widget_id: widget_id,
            data: data
          })

        {:match, conn}
    end
  end
end
