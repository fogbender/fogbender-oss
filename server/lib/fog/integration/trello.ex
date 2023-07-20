defmodule Fog.Integration.Trello do
  @behaviour Fog.Integration.Behaviour

  require Logger

  @api_url "https://api.trello.com"

  # This is a "Power-Up owned by trello@fogbender.com (G group)"
  @api_key Fog.env(:trello_api_key)

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["token"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["board_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["board_name"]
  end

  def commands(_), do: nil

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":trello:#{i.project_id}"
  end

  def check_access(token) do
    r =
      client()
      |> Tesla.get("/1/members/me/boards", query: auth(token))

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def get_list(token, card_id) do
    r =
      client()
      |> Tesla.get("/1/cards/#{card_id}/list", query: auth(token))

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def lists(token, id_board) do
    r =
      client()
      |> Tesla.get("/1/boards/#{id_board}/lists", query: auth(token))

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def get_fogbender_list(token, id_board) do
    {:ok, lists} = lists(token, id_board)
    list = lists |> Enum.find(fn %{"name" => name} -> name === "Customer Support" end)

    case list do
      nil ->
        create_fogbender_list(token, id_board)

      list ->
        {:ok, list}
    end
  end

  def create_fogbender_list(token, id_board) do
    r =
      client()
      |> Tesla.post(
        "/1/lists",
        authmap(
          token,
          %{
            name: "Customer Support",
            idBoard: id_board
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def create_fogbender_label(token, id_board) do
    r =
      client()
      |> Tesla.post(
        "/1/labels",
        authmap(
          token,
          %{
            name: "fogbender",
            color: "purple",
            idBoard: id_board
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def get_card(token, id_card) do
    r =
      client()
      |> Tesla.get("/1/cards/#{id_card}", query: auth(token))

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def issue_info(token, card_id) do
    {:ok, card} = get_card(token, card_id)
    {:ok, normalize_issue(card)}
  end

  def create_card(token, id_board, name, desc \\ "test") do
    {:ok, %{"id" => id_list}} = get_fogbender_list(token, id_board)
    {:ok, %{"id" => id_label}} = create_fogbender_label(token, id_board)

    r =
      client()
      |> Tesla.post(
        "/1/cards",
        authmap(
          token,
          %{
            name: name,
            idList: id_list,
            idLabels: [id_label],
            desc: desc
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def delete_card(token, card_id) do
    r =
      client()
      |> Tesla.delete("/1/cards/#{card_id}", query: auth(token))

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def close_issue(token, id_board, card_id) do
    {:ok, list} = lists(token, id_board)
    done_list_map = list |> Enum.find(fn %{"name" => name} -> name === "Done" end)

    r =
      client()
      |> Tesla.put(
        "/1/cards/#{card_id}",
        authmap(
          token,
          %{
            idList: done_list_map["id"]
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def reopen_issue(token, id_board, card_id) do
    {:ok, list} = lists(token, id_board)
    reopen_list_map = list |> Enum.find(fn %{"name" => name} -> name === "Customer Support" end)

    r =
      client()
      |> Tesla.put(
        "/1/cards/#{card_id}",
        authmap(
          token,
          %{
            idList: reopen_list_map["id"]
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def create_comment(token, card_id, text \\ "test") do
    r =
      client()
      |> Tesla.post(
        "/1/cards/#{card_id}/actions/comments",
        authmap(
          token,
          %{
            text: text
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def search(token, term) do
    r =
      client()
      |> Tesla.get("/1/search",
        query:
          auth(token) ++
            [
              query: term,
              modelTypes: ["cards"],
              cards_limit: 50
            ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"cards" => cards}}} ->
        cards =
          cards
          |> Enum.filter(fn %{"labels" => labels} ->
            labels |> Enum.any?(fn %{"name" => name} -> name === "fogbender" end)
          end)

        {:ok, normalize_issues(cards)}
    end
  end

  def get_webhooks(token) do
    r =
      client()
      |> Tesla.get(
        "/1/tokens/#{token}/webhooks",
        query: auth(token)
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: webhooks}} ->
        {:ok, webhooks}
    end
  end

  def create_webhook(token, id_board, webhook_url) do
    r =
      client()
      |> Tesla.post(
        "/1/webhooks",
        authmap(
          token,
          %{
            description: "Fogbender webhook",
            callbackURL: webhook_url,
            idModel: id_board
          }
        )
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 400,
         body: "A webhook with that callback, model, and token already exists"
       }} ->
        {:ok, webhooks} = get_webhooks(token)

        webhook =
          webhooks
          |> Enum.find(fn %{"callbackURL" => url, "idModel" => id_model} ->
            url === webhook_url and id_model === id_board
          end)

        {:ok, webhook}
    end
  end

  def delete_webhook(token, webhook_id) do
    r =
      client()
      |> Tesla.delete("/1/webhooks/#{webhook_id}", query: auth(token))

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}

      {:ok,
       %Tesla.Env{
         status: 400,
         body: %{"error" => error}
       }} ->
        {:error, error}
    end
  end

  defp normalize_issues(issues) do
    normalize_issues(issues, [])
  end

  defp normalize_issues([], acc) do
    acc
  end

  #
  defp normalize_issues([h | t], acc) do
    issue = normalize_issue(h)
    normalize_issues(t, [issue | acc])
  end

  defp normalize_issue(i) do
    %{
      "id" => id,
      "idShort" => number,
      "url" => url,
      "name" => title,
      "closed" => state,
      "labels" => labels
    } = i

    state =
      case state do
        true ->
          "closed"

        false ->
          "open"
      end

    labels =
      (labels || [])
      |> Enum.map(fn %{"id" => id, "name" => title} ->
        %{
          id: id,
          title: title
        }
      end)

    %{
      type: "trello",
      id: id,
      issueId: id,
      number: number,
      state: state,
      title: title,
      url: url,
      labels: labels
    }
  end

  defp client() do
    trello_url = Fog.env(:trello_host) || @api_url
    base_url = {Tesla.Middleware.BaseUrl, trello_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, json, query, headers]

    Tesla.client(middleware)
  end

  defp auth(token) do
    [
      key: @api_key,
      token: token
    ]
  end

  defp authmap(token, args) do
    Map.merge(
      %{
        key: @api_key,
        token: token
      },
      args
    )
  end
end
